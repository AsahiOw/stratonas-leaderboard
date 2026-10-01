import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { inferInactiveAlternateHair } from './chibi-alternate-hair.mjs';
import { validateGlb } from "../src/lib/chibi/engine.ts";
import {
  CHIBI_RENDERING_POLICY_VERSION,
  CHIBI_RENDERING_PROFILE_VERSION,
  CHIBI_SHADER_ADAPTER_VERSION,
} from "../src/lib/chibi/rendering-profile.ts";
import { CHIBI_SKIN_SKELETON_METADATA_VERSION } from "../src/lib/chibi/core-cache.ts";

test('infers only a source-backed alternate hair skin unused by every selected clip', () => {
  const reference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-source', objectId: '1' };
  const renderers = ['HairA', 'HairB'].map((name, index) => ({
    hierarchyPath: `Root/${name}`, sourceReference: { ...reference, objectId: String(index + 1) },
    defaultVisible: true, hairMaterial: true,
  }));
  const nodes = [
    { name: 'Root', children: [1, 2] },
    { name: 'HairA', mesh: 0, skin: 0, extras: { chibi: { sourceDefaultVisible: true, sourceReference: renderers[0].sourceReference } } },
    { name: 'HairB', mesh: 1, skin: 1, extras: { chibi: { sourceDefaultVisible: true, sourceReference: renderers[1].sourceReference } } },
    ...Array.from({ length: 10 }, (_, index) => ({ name: `Joint${index}` })),
  ];
  const document = {
    nodes, skins: [{ joints: [3, 4, 5, 6, 7, 8, 9] }, { joints: [3, 4, 5, 6, 10, 11, 12] }],
    meshes: [{ primitives: [{ attributes: { JOINTS_0: 0, WEIGHTS_0: 1 } }] }, { primitives: [{ attributes: { JOINTS_0: 2, WEIGHTS_0: 3 } }] }],
    animations: ['Idle', 'Walk'].map(name => ({ name, channels: [7, 8, 9].map(node => ({ target: { node, path: 'rotation' } })) })),
  };
  const joints = Array.from({ length: 100 }, (_, index) => [index < 30 ? 4 : 0, 0, 0, 0]);
  const weights = Array.from({ length: 100 }, () => [1, 0, 0, 0]);
  const read = index => [joints, weights, joints, weights][index];
  const paths = ['', 'Root/HairA', 'Root/HairB'];
  assert.deepEqual(inferInactiveAlternateHair(document, renderers, paths, ['Idle', 'Walk'], read),
    [{ hierarchyPath: 'Root/HairB', vertices: 100, influenced: 30 }]);
  assert.deepEqual(inferInactiveAlternateHair(document, [renderers[0]], paths, ['Idle', 'Walk'], read), []);
  assert.deepEqual(inferInactiveAlternateHair(document, renderers, paths, ['Idle', 'Missing'], read), []);
  document.animations[1].channels.push({ target: { node: 10, path: 'rotation' } });
  assert.deepEqual(inferInactiveAlternateHair(document, renderers, paths, ['Idle', 'Walk'], read), []);
});

function glbWithMaterials(names) {
  const document = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: 0 }],
    materials: names.map((name) => ({ name })),
    animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8);
  output.write("glTF");
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(0, binaryOffset);
  output.writeUInt32LE(0x004e4942, binaryOffset + 4);
  return output;
}

function glbWithEmbeddedRenderingProfile(renderingProfile) {
  const binary = Buffer.alloc(12);
  const document = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: binary.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: binary.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: "VEC3", min: [0, 0, 0], max: [0, 0, 0] }],
    scenes: [{ nodes: [0, 1], extras: { chibi: { renderingProfile, renderingProfileDiagnostics: {} } } }],
    scene: 0,
    nodes: [{ mesh: 0, skin: 0 }, { name: "Joint" }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    skins: [{ joints: [1] }],
    materials: [],
    animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  output.write("glTF");
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(binary.length, binaryOffset);
  output.writeUInt32LE(0x004e4942, binaryOffset + 4);
  binary.copy(output, binaryOffset + 8);
  return output;
}

function glbWithFaceVariants() {
  const document = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [
      { name: "Cafe_Fixture", children: [1, 2, 3] },
      { name: "Fixture_Face_Outline" },
      { name: "Fixture_Face01_Outline" },
      { name: "Fixture_Face02_Outline" },
    ],
    materials: [{ name: "Fixture_Face" }],
    animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8);
  output.write("glTF");
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(0, binaryOffset);
  output.writeUInt32LE(0x004e4942, binaryOffset + 4);
  return output;
}

function glbWithEyeMouthFaceVariants() {
  const document = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [
      { name: "Cafe_Fixture", children: [1, 2] },
      { name: "Fixture_Face_Outline", mesh: 0 },
      { name: "Fixture_Face01_Outline", mesh: 1 },
    ],
    meshes: [
      { primitives: [{ material: 0 }] },
      { primitives: [{ material: 1 }] },
    ],
    materials: [{ name: "Fixture_EyeMouth" }, { name: "Fixture_Face" }],
    animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8);
  output.write("glTF");
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(0, binaryOffset);
  output.writeUInt32LE(0x004e4942, binaryOffset + 4);
  return output;
}

function glbWithAssemblyNodes() {
  const document = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: 0 }],
    scenes: [{ nodes: [0, 1] }],
    scene: 0,
    nodes: [
      { name: "Shun_Original_Weapon", mesh: 0 },
      { name: "Shun_Original_Alternate", mesh: 0 },
    ],
    meshes: [{ primitives: [] }],
    materials: [],
    animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8);
  output.write("glTF");
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(0, binaryOffset);
  output.writeUInt32LE(0x004e4942, binaryOffset + 4);
  return output;
}

function glbWithInvalidSkinIndex() {
  const binary = Buffer.from([0, 0, 0, 1]);
  const document = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: binary.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: binary.length }],
    accessors: [{ bufferView: 0, componentType: 5121, count: 1, type: "VEC4" }],
    skins: [{ joints: [0] }],
    nodes: [{ name: "Joint" }, { name: "Fixture_Body", mesh: 0, skin: 0 }],
    scenes: [{ nodes: [0, 1] }],
    scene: 0,
    meshes: [{ primitives: [{ attributes: { JOINTS_0: 0 } }] }],
    materials: [],
    animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  output.write("glTF"); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(binary.length, binaryOffset); output.writeUInt32LE(0x004e4942, binaryOffset + 4); binary.copy(output, binaryOffset + 8);
  return output;
}

function glbWithSkinSkeleton(skeleton, mutate = () => {}) {
  const binary = Buffer.from([0, 0, 0, 0]);
  const skin = { joints: [2, 4], ...(skeleton === undefined ? {} : { skeleton }) };
  const document = {
    asset: { version: "2.0" }, buffers: [{ byteLength: binary.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: binary.length }],
    accessors: [{ bufferView: 0, componentType: 5121, count: 1, type: "VEC4" }],
    skins: [skin],
    nodes: [
      { name: "Root", children: [1, 3] }, { name: "Branch A", children: [2] }, { name: "Joint A" },
      { name: "Branch B", children: [4] }, { name: "Joint B" },
    ],
    scenes: [{ nodes: [0] }], scene: 0, meshes: [{ primitives: [] }], materials: [], animations: [],
  };
  mutate(document);
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  output.write("glTF"); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(binary.length, binaryOffset); output.writeUInt32LE(0x004e4942, binaryOffset + 4); binary.copy(output, binaryOffset + 8);
  return output;
}

function glbWithInvalidVertexColor() {
  const binary = Buffer.from(new Float32Array([NaN, NaN, NaN, NaN]).buffer);
  const document = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: binary.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: binary.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: "VEC4" }],
    nodes: [{ name: "Fixture_Weapon", mesh: 0 }],
    scenes: [{ nodes: [0] }], scene: 0,
    meshes: [{ primitives: [{ attributes: { COLOR_0: 0 } }] }],
    materials: [{ name: "Fixture_Weapon" }], animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  output.write("glTF"); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(binary.length, binaryOffset); output.writeUInt32LE(0x004e4942, binaryOffset + 4); binary.copy(output, binaryOffset + 8);
  return output;
}

function readGlbBinary(buffer) {
  const jsonLength = buffer.readUInt32LE(12);
  const binOffset = 20 + jsonLength;
  const binLength = buffer.readUInt32LE(binOffset);
  return buffer.subarray(binOffset + 8, binOffset + 8 + binLength);
}

function glbWithEyeMouthGeometry(materialNames = ["Fixture_EyeMouth"], eyeAlpha = [0, .5, 1]) {
  const uv = Buffer.from(new Float32Array([
    .5, .5, .6, .5, .5, .6,
    .1, .8, .2, .8, .1, .9,
  ]).buffer);
  const indices = Buffer.from(new Uint16Array([0, 1, 2, 3, 4, 5]).buffer);
  const colors = Buffer.from(new Float32Array([
    1, 1, 1, eyeAlpha[0], 1, 1, 1, eyeAlpha[1], 1, 1, 1, eyeAlpha[2],
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  ]).buffer);
  const binary = Buffer.concat([uv, indices, colors]);
  const document = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: uv.length },
      { buffer: 0, byteOffset: uv.length, byteLength: indices.length },
      { buffer: 0, byteOffset: uv.length + indices.length, byteLength: colors.length },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 6, type: "VEC2" },
      { bufferView: 1, componentType: 5123, count: 6, type: "SCALAR" },
      { bufferView: 2, componentType: 5126, count: 6, type: "VEC4" },
    ],
    materials: materialNames.map((name) => ({ name })),
    images: [],
    samplers: [],
    textures: [],
    meshes: [{ primitives: materialNames.map((_, material) => ({ attributes: { TEXCOORD_0: 0, COLOR_0: 2 }, indices: 1, material })) }],
    animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  output.write("glTF");
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(binary.length, binaryOffset);
  output.writeUInt32LE(0x004e4942, binaryOffset + 4);
  binary.copy(output, binaryOffset + 8);
  return output;
}

function runPostprocess(script, input, output, config) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, input, output, config], { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stderr }));
  });
}

test('embeds exact source halo following after hierarchy postprocessing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-halo-follow-'));
  try {
    const input = path.join(root, 'input.glb'), output = path.join(root, 'output.glb'), config = path.join(root, 'config.json');
    const original = glbWithProfileRenderer();
    const document = readGlbJson(original);
    document.nodes[1].children.push(3, 4);
    document.nodes.push({ name: 'Hover', translation: [0, 100, -20] }, { name: 'Target' });
    const json = Buffer.from(JSON.stringify(document));
    const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
    const header = Buffer.from(original.subarray(0, 20)), tail = original.subarray(20 + original.readUInt32LE(12));
    header.writeUInt32LE(20 + padded.length + tail.length, 8); header.writeUInt32LE(padded.length, 12);
    await writeFile(input, Buffer.concat([header, padded, tail]));
    const source = { haloPath: 'Fixture/Hover', targetPath: 'Fixture/Target', haloRestPosition: [0, 1, -.2],
      offset: [.3, -.2, 0], rotation: [0, 0, 0, 1], clampMin: [.2, -.3, -.2], clampMax: [.4, -.1, .2],
      positionPower: .1, rotationPower: .07, fixYRotation: false };
    await writeFile(config, JSON.stringify({ sourceIdentity: 'fixture', exportClips: [], incompleteImport: { warnings: [], materialSlots: [] }, haloFollow: { bindings: [source], warnings: [] } }));
    const result = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const processed = readGlbJson(await readFile(output));
    const follow = processed.scenes[0].extras.chibi.haloFollow;
    assert.equal(follow.schemaVersion, 1); assert.equal(follow.bindings.length, 1); assert.deepEqual(follow.warnings, []);
    assert.equal(processed.nodes[follow.bindings[0].haloNodeIndex].name, 'Hover');
    assert.equal(processed.nodes[follow.bindings[0].targetNodeIndex].name, 'Target');
    assert.deepEqual(follow.bindings[0].offset, [30, -20, 0]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

function readGlbJson(buffer) {
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").replace(/[\u0000 ]+$/, ""));
}

function glbWithProfileRenderer(uv = [.5, .5, .6, .5, .5, .6, .1, .8, .2, .8, .1, .9], duplicatePath = false, extraEyeMouthSlot = false, extraUnprofiledGeometry = false, extraPresentationGeometry = false, presentationNodeName = "FX_CutinPlane") {
  const uvBytes = Buffer.from(new Float32Array(uv).buffer);
  const indexBytes = Buffer.from(new Uint16Array([0, 1, 2, 3, 4, 5]).buffer);
  const colorBytes = extraEyeMouthSlot ? Buffer.from(new Float32Array(24).fill(1).buffer) : Buffer.alloc(0);
  const binary = Buffer.concat([uvBytes, indexBytes, colorBytes]);
  const extraNodeNames = [
    ...(extraUnprofiledGeometry ? ["Unprofiled"] : []),
    ...(extraPresentationGeometry ? [presentationNodeName] : []),
  ];
  const document = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: uvBytes.length },
      { buffer: 0, byteOffset: uvBytes.length, byteLength: indexBytes.length },
      ...(extraEyeMouthSlot ? [{ buffer: 0, byteOffset: uvBytes.length + indexBytes.length, byteLength: colorBytes.length }] : []),
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 6, type: "VEC2" },
      { bufferView: 1, componentType: 5123, count: 6, type: "SCALAR" },
      ...(extraEyeMouthSlot ? [{ bufferView: 2, componentType: 5126, count: 6, type: "VEC4" }] : []),
    ],
    scenes: [{ nodes: [0] }], scene: 0,
    nodes: duplicatePath
      ? [{ name: "RootNode", children: [1, 3] }, { name: "Fixture", children: [2] }, { name: "Body", mesh: 0 }, { name: "Fixture", children: [4] }, { name: "Body", mesh: 0 }]
      : [{ name: "RootNode", children: [1] }, { name: "Fixture", children: [2, ...extraNodeNames.map((_, index) => index + 3)] }, { name: "Body", mesh: 0 }, ...extraNodeNames.map((name) => ({ name, mesh: 0 }))],
    meshes: [{ primitives: [
      { attributes: { TEXCOORD_0: 0 }, indices: 1, material: 0 },
      ...(extraEyeMouthSlot ? [{ attributes: { TEXCOORD_0: 0, COLOR_0: 2 }, indices: 1, material: 1 }] : []),
    ] }],
    materials: [{ name: "Fixture_EyeMouth", alphaMode: "BLEND" }, ...(extraEyeMouthSlot ? [{ name: "Fixture_ExtraEyeMouth", alphaMode: "BLEND" }] : [])],
    textures: [],
    animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  output.write("glTF"); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(binary.length, binaryOffset); output.writeUInt32LE(0x004e4942, binaryOffset + 4); binary.copy(output, binaryOffset + 8);
  return output;
}

function glbWithFourMouthSeamTriangles({ mode, jointOverflow = false, indexed = true } = {}) {
  const uv = [];
  const positions = [];
  const normals = [];
  const colors = [];
  const tangents = [];
  const joints = [];
  const weights = [];
  const morphPositions = [];
  for (let triangle = 0; triangle < 4; triangle += 1) {
    const sourceUV = [[.1, .8], [.3, .8], [.1, .9]];
    sourceUV.forEach(([u, v], corner) => {
      uv.push(u, v);
      positions.push(triangle + corner * .1, v, 0);
      normals.push(0, 0, 1);
      colors.push(corner === 0 ? 0 : 1, triangle / 4, corner / 2, 1);
      tangents.push(1, 0, 0, 1);
      morphPositions.push(triangle + corner * .1, v + .01, 0);
    });
    if (jointOverflow) {
      joints.push(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
      weights.push(1 / 3, 1 / 3, 1 / 3, 0, 1 / 3, 1 / 3, 1 / 3, 0, 1 / 3, 1 / 3, 1 / 3, 0);
    } else {
      joints.push(triangle, triangle + 1, triangle + 2, 0, triangle + 1, triangle + 2, triangle + 3, 0, triangle + 2, triangle + 3, triangle + 4, 0);
      weights.push(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0);
    }
  }
  const chunks = [
    { bytes: Buffer.from(new Float32Array(positions).buffer), componentType: 5126, count: 12, type: "VEC3" },
    { bytes: Buffer.from(new Float32Array(normals).buffer), componentType: 5126, count: 12, type: "VEC3" },
    { bytes: Buffer.from(new Float32Array(uv).buffer), componentType: 5126, count: 12, type: "VEC2" },
    { bytes: Buffer.from(new Float32Array(colors).buffer), componentType: 5126, count: 12, type: "VEC4" },
    { bytes: Buffer.from(new Float32Array(tangents).buffer), componentType: 5126, count: 12, type: "VEC4" },
    { bytes: Buffer.from(new Uint16Array(joints).buffer), componentType: 5123, count: 12, type: "VEC4" },
    { bytes: Buffer.from(new Float32Array(weights).buffer), componentType: 5126, count: 12, type: "VEC4" },
    { bytes: Buffer.from(new Uint16Array([...Array(12).keys()]).buffer), componentType: 5123, count: 12, type: "SCALAR" },
    { bytes: Buffer.from(new Float32Array(morphPositions).buffer), componentType: 5126, count: 12, type: "VEC3" },
  ];
  const binary = Buffer.concat(chunks.map(chunk => chunk.bytes));
  let offset = 0;
  const bufferViews = [];
  const accessors = [];
  for (const chunk of chunks) {
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: chunk.bytes.length });
    accessors.push({ bufferView: bufferViews.length - 1, componentType: chunk.componentType, count: chunk.count, type: chunk.type });
    offset += chunk.bytes.length;
  }
  const document = {
    asset: { version: "2.0" }, buffers: [{ byteLength: binary.length }], bufferViews, accessors,
    scenes: [{ nodes: [0] }], scene: 0,
    nodes: [{ name: "RootNode", children: [1] }, { name: "Fixture", children: [2] }, { name: "Body", mesh: 0, skin: 0 }],
    skins: [{ joints: [...Array(jointOverflow ? 12 : 8).keys()] }],
    meshes: [{ primitives: [{
      ...(mode === undefined ? {} : { mode }),
      attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, COLOR_1: 3, TANGENT: 4, JOINTS_0: 5, WEIGHTS_0: 6 },
      ...(indexed ? { indices: 7 } : {}), material: 0, targets: [{ POSITION: 8 }],
    }] }],
    materials: [{ name: "Fixture_EyeMouth" }], images: [], samplers: [], textures: [], animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  output.write("glTF"); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(binary.length, binaryOffset); output.writeUInt32LE(0x004e4942, binaryOffset + 4); binary.copy(output, binaryOffset + 8);
  return output;
}

function readDocumentAccessor(document, binary, index) {
  const accessor = document.accessors[index];
  const view = document.bufferViews[accessor.bufferView];
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
  const componentSize = { 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
  const reader = accessor.componentType === 5123 ? "readUInt16LE" : accessor.componentType === 5125 ? "readUInt32LE" : "readFloatLE";
  const values = [];
  for (let row = 0; row < accessor.count; row += 1) {
    const start = (view.byteOffset ?? 0) + row * componentSize * components;
    values.push(Array.from({ length: components }, (_, component) => binary[reader](start + component * componentSize)));
  }
  return values;
}

function glbWithMouthOnlyAndSeparateEyeRenderers() {
  const bodyUv = Buffer.from(new Float32Array([.1, .8, .2, .8, .1, .9]).buffer);
  const bodyIndices = Buffer.from(new Uint16Array([0, 1, 2]).buffer);
  const eyeUv = Buffer.from(new Float32Array([.5, .5, .6, .5, .5, .6]).buffer);
  const eyeIndices = Buffer.from(new Uint16Array([0, 1, 2]).buffer);
  const binary = Buffer.alloc(64);
  bodyUv.copy(binary, 0);
  bodyIndices.copy(binary, 24);
  eyeUv.copy(binary, 32);
  eyeIndices.copy(binary, 56);
  const document = {
    asset: { version: "2.0" }, buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: bodyUv.length },
      { buffer: 0, byteOffset: 24, byteLength: bodyIndices.length },
      { buffer: 0, byteOffset: 32, byteLength: eyeUv.length },
      { buffer: 0, byteOffset: 56, byteLength: eyeIndices.length },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC2" },
      { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
      { bufferView: 2, componentType: 5126, count: 3, type: "VEC2" },
      { bufferView: 3, componentType: 5123, count: 3, type: "SCALAR" },
    ],
    scenes: [{ nodes: [0] }], scene: 0,
    nodes: [{ name: "RootNode", children: [1] }, { name: "Fixture", children: [2, 3] }, { name: "Body", mesh: 0 }, { name: "Face_Outline", mesh: 1 }],
    meshes: [
      { primitives: [{ attributes: { TEXCOORD_0: 0 }, indices: 1, material: 0 }] },
      { primitives: [{ attributes: { TEXCOORD_0: 2 }, indices: 3, material: 0 }] },
    ],
    materials: [{ name: "Fixture_EyeMouth", alphaMode: "BLEND" }], animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  output.write("glTF"); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
  const binaryOffset = 20 + json.length;
  output.writeUInt32LE(binary.length, binaryOffset); output.writeUInt32LE(0x004e4942, binaryOffset + 4); binary.copy(output, binaryOffset + 8);
  return output;
}

function renderingProfileWithSeparateEyeRenderer() {
  const profile = renderingProfile();
  const body = profile.renderers[0];
  const faceSourceReference = { ...body.sourceReference, objectId: "9007199254740994" };
  const faceSlot = JSON.parse(JSON.stringify(body.materialSlots[0]));
  profile.renderers.push({
    ...body,
    sourceReference: faceSourceReference,
    name: "Fixture_Face_Outline",
    hierarchyPath: "Fixture/Face_Outline",
    sourceMesh: {
      ...body.sourceMesh,
      pathId: "2",
      sourceReference: { ...body.sourceMesh.sourceReference, objectId: "2" },
    },
    glbNodeIndex: null,
    materialSlots: [faceSlot],
  });
  profile.drawSequence.push(`${faceSourceReference.bundleSha256}:${faceSourceReference.serializedFile.toLowerCase()}:${faceSourceReference.objectId}`);
  return profile;
}

function renderingProfileWithStructuralEquipmentEvidence() {
  const profile = renderingProfileWithSeparateEyeRenderer();
  profile.mouth = null;
  const body = profile.renderers[0];
  const equipment = profile.renderers[1];
  const rootBone = { file: "CAB-fixture", pathId: "101", name: "FixtureRoot" };
  const equipmentBone = { file: "CAB-fixture", pathId: "102", name: "EquipmentRoot" };
  const equipmentTip = { file: "CAB-fixture", pathId: "103", name: "EquipmentTip" };
  const transformChain = [rootBone, equipmentBone, equipmentTip];
  const boneReferences = [equipmentBone, equipmentTip];
  const assemblyRenderer = (renderer, structural = false) => ({
    sourceReference: renderer.sourceReference,
    name: renderer.name,
    hierarchyPath: renderer.hierarchyPath,
    rendererType: renderer.rendererType,
    mesh: { file: renderer.sourceMesh.file, pathId: renderer.sourceMesh.pathId },
    meshSourceReference: renderer.sourceMesh.sourceReference,
    materialSlots: renderer.materialSlots.map((slot) => ({
      slot: slot.slot,
      sourceMaterialReference: slot.sourceMaterialReference,
      sourceShaderReference: slot.sourceShaderReference,
    })),
    ...(structural ? { rootBone, transformChain, boneReferences } : {}),
  });
  profile.assembly = {
    root: "Fixture",
    rendererOrder: [body.name, equipment.name],
    renderers: [assemblyRenderer(body), assemblyRenderer(equipment, true)],
    attachments: {},
  };
  const evidence = {
    sourceReference: equipment.sourceReference,
    classification: "structurally-bound-equipment",
    reasonCode: "STRUCTURAL_TRANSFORM_BONE_ANCESTRY",
    reason: "The equipment renderer shares an exact source mesh/material identity and transform/bone ancestry with the selected body renderer.",
    name: equipment.name,
    hierarchyPath: equipment.hierarchyPath,
    sourceMeshReference: equipment.sourceMesh.sourceReference,
    sourceMaterialReferences: [equipment.materialSlots[0].sourceMaterialReference],
    sourceShaderReferences: [equipment.materialSlots[0].sourceShaderReference],
    rootBone: structuredClone(rootBone),
    transformChain: structuredClone(transformChain),
    boneReferences: structuredClone(boneReferences),
    matchedAncestorPointers: [structuredClone(equipmentBone)],
    bodyRendererReferences: [body.sourceReference],
    evidence: [
      "exact source renderer, mesh, material, and shader identities are preserved",
      "transform chain and bone references share the selected body ancestry",
    ],
  };
  profile.equipmentBindingEvidence = [evidence];
  profile.coreRendererBlockers = [];
  profile.validation = {
    ...profile.validation,
    equipmentBindingEvidence: [structuredClone(evidence)],
    coreRendererBlockers: [],
  };
  return profile;
}

function renderingProfileWithExactSourceWeaponAncestryEvidence({ ancestorOnlyInRootBoneAncestry = false } = {}) {
  const profile = renderingProfileWithStructuralEquipmentEvidence();
  const equipment = profile.renderers[1];
  const sourceReference = equipment.sourceReference;
  const sourcePointer = (pathId, name) => ({
    file: sourceReference.serializedFile,
    pathId,
    name,
    sourceReference: {
      bundleSha256: sourceReference.bundleSha256,
      serializedFile: sourceReference.serializedFile,
      objectId: pathId,
    },
  });
  const rootBone = sourcePointer("201", "ExactWeaponRoot");
  const weaponAncestor = sourcePointer("202", "Bip001_Weapon");
  const transformChain = [sourcePointer("1", "Fixture"), rootBone, ...(ancestorOnlyInRootBoneAncestry ? [] : [weaponAncestor])];
  const boneReferences = ancestorOnlyInRootBoneAncestry ? [rootBone] : [weaponAncestor];
  const profilePointer = ({ sourceReference: _sourceReference, ...pointer }) => pointer;
  const assemblyEquipment = profile.assembly.renderers[1];
  profile.assembly.prefabReference = {
    bundleSha256: sourceReference.bundleSha256,
    serializedFile: sourceReference.serializedFile,
    objectId: "1",
  };
  profile.assembly.attachments = { mainWeapon: [structuredClone(weaponAncestor)] };
  assemblyEquipment.rootBone = structuredClone(rootBone);
  assemblyEquipment.transformChain = structuredClone(transformChain);
  assemblyEquipment.boneReferences = structuredClone(boneReferences);
  assemblyEquipment.rootBoneAncestry = [structuredClone(weaponAncestor)];
  assemblyEquipment.rootBoneAncestryComplete = true;
  const evidence = {
    sourceReference: equipment.sourceReference,
    classification: "structurally-bound-equipment",
    reasonCode: "EXACT_SOURCE_WEAPON_ANCESTRY",
    reason: "Source rootBone.m_Father ancestry reaches exactly one full-identity mainWeapon/subWeapon pointer.",
    name: equipment.name,
    hierarchyPath: equipment.hierarchyPath,
    sourceMeshReference: equipment.sourceMesh.sourceReference,
    sourceMaterialReferences: [equipment.materialSlots[0].sourceMaterialReference],
    sourceShaderReferences: [equipment.materialSlots[0].sourceShaderReference],
    rootBone: profilePointer(rootBone),
    transformChain: transformChain.map(profilePointer),
    rootBoneAncestry: [structuredClone(weaponAncestor)],
    boneReferences: boneReferences.map(profilePointer),
    matchedAncestorPointers: [profilePointer(weaponAncestor)],
    bodyRendererReferences: [],
    evidence: [
      "exact source renderer reference a:CAB-fixture:9007199254740994",
      "exact source mesh reference e:CAB-mesh:2",
      "source rootBone.m_Father ancestry reaches exactly one authored mainWeapon/subWeapon pointer",
      "body m_Bones overlap: none or non-conflicting; exact source weapon ancestry remains unique",
      "unique non-conflicting full-source weapon ancestor relation",
    ],
  };
  profile.equipmentBindingEvidence = [evidence];
  profile.coreRendererBlockers = [];
  profile.validation = {
    ...profile.validation,
    equipmentBindingEvidence: [structuredClone(evidence)],
    coreRendererBlockers: [],
  };
  return profile;
}

function renderingProfile({ hierarchyPath = "Fixture/Body", mouth = true, extraEyeMouthSlot = false } = {}) {
  const rendererReference = { bundleSha256: "a".repeat(64), serializedFile: "CAB-fixture", objectId: "9007199254740993" };
  const materialReference = { bundleSha256: "b".repeat(64), serializedFile: "CAB-materials", objectId: "9007199254740995" };
  const shaderReference = { bundleSha256: "c".repeat(64), serializedFile: "CAB-shaders", objectId: "9007199254740997" };
  const textureReference = { bundleSha256: "d".repeat(64), serializedFile: "CAB-textures", objectId: "9007199254740999" };
  const materialSlot = {
    slot: 0, sourceMaterialReference: materialReference, sourceMaterialName: "Fixture_EyeMouth",
    sourceShaderReference: shaderReference, sourceShaderName: "MXCharacterEyesMouthV2", sourceShaderParsedName: "MX/C-EyesMouth",
    shaderProgramBlobSha256: "f".repeat(64), adapterId: "mx-character-eyemouth",
    materialProperties: {
      floats: { _MouthTileCols: 8, _MouthTileRows: 8 }, ints: {}, colors: {},
      textures: [{ name: "_MouthTileTex", texture: { file: "CAB-textures", pathId: "9007199254740999" }, textureReference, scale: { x: 0.5, y: 0.5 }, offset: { x: 0.5, y: 0.875 } }],
    },
    adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: null },
    renderState: { sourceQueue: 2001, layer: "transparent", alphaMode: "BLEND", depthWrite: true, depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false, blend: { source: 5, destination: 10 } },
    glb: null,
  };
  const renderer = {
    sourceReference: rendererReference, name: "Fixture_Body", hierarchyPath, rendererType: "SkinnedMeshRenderer", defaultVisible: true,
    sourceMesh: { file: "CAB-mesh", pathId: "1", sourceReference: { bundleSha256: "e".repeat(64), serializedFile: "CAB-mesh", objectId: "1" } },
    glbNodeIndex: null,
    materialSlots: [materialSlot, ...(extraEyeMouthSlot ? [{
      ...materialSlot,
      slot: 1,
      sourceMaterialReference: { ...materialReference, objectId: "9007199254740996" },
      sourceMaterialName: "Fixture_ExtraEyeMouth",
    }] : [])],
  };
  return {
    schemaVersion: 2, profileVersion: CHIBI_RENDERING_PROFILE_VERSION, policyVersion: CHIBI_RENDERING_POLICY_VERSION, adapterVersion: CHIBI_SHADER_ADAPTER_VERSION,
    sourceIdentity: "fixture", dependencyFingerprint: "fixture-fingerprint",
    sourcePrefab: { path: "Assets/Fixture.prefab", reference: { bundleSha256: "a".repeat(64), serializedFile: "CAB-fixture", objectId: "1" } },
    renderers: [renderer], assembly: null, childRendererEvents: [], excludedRenderers: [], excludedChildRendererEvents: [],
    fxExclusionProofs: [], excludedFxInstantiationEvents: [],
    mouth: mouth ? {
      sourceRendererReference: rendererReference, materialSlot: 0, defaultUV: { x: 0.125, y: 0.625 }, defaultTile: 501,
      columns: 8, rows: 8, textureProperty: "_MouthTileTex", textureReference,
      textureTransform: { scale: { x: 0.5, y: 0.5 }, offset: { x: 0.5, y: 0.875 } },
      shaderUvRule: { xLessEqual: 0.25, yLessEqual: 0.25, glbVInverted: true },
      events: [{ clip: "Fixture_Cafe_Idle", time: 0.5, tile: 203, flipX: true }],
      glbPrimitiveIndices: { eyes: [], mouth: [] }, glbMaterialIndex: null,
    } : null,
    drawSequence: [`${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}`],
    validation: { valid: true, unresolved: [], excludedRenderers: [], excludedChildRendererEvents: [], fxExclusionProofs: [], excludedFxInstantiationEvents: [] },
  };
}

test('fallback identifies face masks only for uniquely resolved matching source shaders', async () => {
  const { applyIncompleteMaterials } = await import('./chibi-incomplete-materials.mjs');
  const names = ['Face', 'OtherShader', 'Unresolved'];
  const json = { scenes: [{}], materials: names.map(name => ({ name })) };
  const slots = names.map((sourceMaterialName, index) => ({ sourceMaterialName,
    sourceMaterialReference: index === 2 ? null : { objectId: String(index) },
    adapterId: 'mx-character-face', sourceShaderParsedName: index === 1 ? 'Other/Face' : 'MX/C-Face',
  }));
  applyIncompleteMaterials(json, { incompleteImport: { warnings: [], materialSlots: slots } }, () => {}, []);
  assert.equal(json.materials[0].extras.chibi.adapterId, 'mx-character-face');
  assert.equal(json.materials[1].extras, undefined);
  assert.equal(json.materials[2].extras, undefined);
});

test('Layer4 fallback omits unused vertex tint only for uniquely bound matching shader materials', async () => {
  const { applyIncompleteMaterials } = await import('./chibi-incomplete-materials.mjs');
  const names = ['Body', 'OtherShader', 'WrongAdapter', 'Unresolved'];
  const json = { scenes: [{}], materials: names.map(name => ({ name, alphaMode: 'OPAQUE',
    pbrMetallicRoughness: { baseColorTexture: { index: 0 }, baseColorFactor: [1, .9, .8, 1] } })),
    meshes: [{ primitives: names.map((_, material) => ({ material, attributes: { COLOR_0: 3, POSITION: 0 } })) }] };
  const before = structuredClone(json.materials);
  const materialSlots = names.map((sourceMaterialName, i) => ({ sourceMaterialName,
    sourceMaterialReference: i === 3 ? null : { objectId: String(i) },
    adapterId: i === 2 ? 'mx-character-hair' : 'mx-character-general',
    sourceShaderParsedName: i === 1 ? 'MX/C-General' : 'MX/C-General/Layer4' }));
  applyIncompleteMaterials(json, { incompleteImport: { warnings: [], materialSlots } }, () => { throw new Error('Unexpected texture rewrite'); }, []);
  assert.equal(json.meshes[0].primitives[0].attributes.COLOR_0, undefined);
  for (const primitive of json.meshes[0].primitives.slice(1)) assert.equal(primitive.attributes.COLOR_0, 3);
  assert.deepEqual(json.materials, before);
});

test('hair fallback ignores verified source lighting masks without changing textures or other materials', async () => {
  const { applyIncompleteMaterials } = await import('./chibi-incomplete-materials.mjs');
  const names = ['Fringe', 'OtherTransparent', 'OpaqueHair'];
  const json = { scenes: [{}], materials: names.map(name => ({ name, alphaMode: 'BLEND',
    pbrMetallicRoughness: { baseColorTexture: { index: 0 }, baseColorFactor: [1, 1, 1, .8] } })),
    meshes: [{ primitives: names.map((_, material) => ({ material, attributes: { COLOR_0: 3, POSITION: 0 } })) }],
    images: [{ uri: 'hair-with-transparent-edges.png' }], textures: [{ source: 0 }] };
  const before = structuredClone(json.materials);
  const slots = names.map((sourceMaterialName, i) => ({ sourceMaterialName,
    sourceMaterialReference: { objectId: String(i) }, adapterId: 'mx-character-hair',
    sourceShaderParsedName: ['MX/C-Hair-Transparent', 'Another/Transparent', 'MX/C-Hair'][i] }));
  applyIncompleteMaterials(json, { incompleteImport: { warnings: [], materialSlots: slots } }, () => { throw new Error('Unexpected texture rewrite'); }, []);
  assert.equal(json.meshes[0].primitives[0].attributes.COLOR_0, undefined);
  assert.equal(json.meshes[0].primitives[1].attributes.COLOR_0, 3);
  assert.equal(json.meshes[0].primitives[2].attributes.COLOR_0, undefined);
  assert.deepEqual(json.materials, before);
  assert.deepEqual(json.textures, [{ source: 0 }]);
});

for (const shader of ['MX/C-Simple-Transparent', 'MX/C-General/Transparent']) test(`${shader} fallback keeps texture opacity when vertex alpha is a rim mask`, async () => {
  const { applyIncompleteMaterials } = await import('./chibi-incomplete-materials.mjs');
  const names = ['Dress', 'OtherTransparent', 'WrongAdapter', 'Unresolved'];
  const json = { scenes: [{}], materials: names.map(name => ({ name, alphaMode: 'BLEND',
    pbrMetallicRoughness: { baseColorTexture: { index: 0 }, baseColorFactor: [1, 1, 1, 1] } })),
    meshes: [{ primitives: names.map((_, material) => ({ material, attributes: { COLOR_0: 3, POSITION: 0 } })) }],
    images: [{ uri: 'semi-transparent-fabric.png' }], textures: [{ source: 0 }] };
  const before = structuredClone(json.materials);
  const slots = names.map((sourceMaterialName, i) => ({ sourceMaterialName,
    sourceMaterialReference: i === 3 ? null : { objectId: String(i) },
    adapterId: i === 2 ? 'mx-character-hair' : 'mx-character-general',
    sourceShaderParsedName: i === 1 ? 'Other/Transparent' : shader }));
  applyIncompleteMaterials(json, { incompleteImport: { warnings: [], materialSlots: slots } }, () => { throw new Error('Unexpected texture rewrite'); }, []);
  assert.equal(json.meshes[0].primitives[0].attributes.COLOR_0, undefined);
  for (const primitive of json.meshes[0].primitives.slice(1)) assert.equal(primitive.attributes.COLOR_0, 3);
  assert.deepEqual(json.materials, before);
  assert.deepEqual(json.textures, [{ source: 0 }]);
});

test('incomplete imports preserve source eye bytes and depth without inventing numeric targets', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'chibi-incomplete-'));
  try {
    const input = path.join(directory, 'raw.glb'), output = path.join(directory, 'result.glb');
    const config = path.join(directory, 'config.json'), texture = path.join(directory, 'eye.png');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5nQAAAAASUVORK5CYII=', 'base64');
    const slot = renderingProfile().renderers[0].materialSlots[0];
    await writeFile(input, glbWithProfileRenderer());
    await writeFile(texture, png);
    await writeFile(config, JSON.stringify({
      exportClips: ['Missing_Pickup'],
      incompleteImport: { warnings: ['Numeric renderer targets unresolved'], materialSlots: [slot], renderers: [{
        hierarchyPath: 'Fixture/Body', sourceReference: renderingProfile().renderers[0].sourceReference, defaultVisible: false,
      }] },
      sourceTextureExports: [{ sourceMaterialName: slot.sourceMaterialName, textureProperty: '_MainTex', path: texture }],
      childRendererEvents: [{ clip: 'Idle', function: 'AniEvt_EnableChildRenderer', int: 2, time: 0 }],
    }));
    const result = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const bytes = await readFile(output), document = readGlbJson(bytes), binary = readGlbBinary(bytes);
    const material = document.materials[0];
    assert.equal(material.alphaMode, 'BLEND');
    assert.equal(material.extras.chibi.depthTest, true);
    assert.equal(material.extras.chibi.depthWrite, true);
    assert.equal(material.extras.chibi.polygonOffsetFactor, 0);
    const image = document.images[document.textures[material.pbrMetallicRoughness.baseColorTexture.index].source];
    const view = document.bufferViews[image.bufferView];
    assert.deepEqual(binary.subarray(view.byteOffset, view.byteOffset + view.byteLength), png);
    const metadata = document.scenes[0].extras.chibi;
    assert.equal(metadata.incompleteImport.sourceComplete, false);
    assert.ok(metadata.incompleteImport.warnings.includes('Missing animation: Missing_Pickup'));
    assert.equal(metadata.rendererSlots, undefined);
    assert.equal(metadata.rendererEvents, undefined);
    assert.equal(document.nodes[2].extras.chibi.sourceDefaultVisible, false);
    assert.deepEqual(document.animations, []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

function renderingProfileWithPresentationExclusion() {
  const profile = renderingProfile({ mouth: false });
  const sourceReference = { ...profile.renderers[0].sourceReference, objectId: "9007199254741011" };
  const sourceMeshReference = { ...profile.renderers[0].sourceMesh.sourceReference, objectId: "9007199254741012" };
  const sourceMaterialReference = { ...profile.renderers[0].materialSlots[0].sourceMaterialReference, objectId: "9007199254741013" };
  const sourceShaderReference = { ...profile.renderers[0].materialSlots[0].sourceShaderReference, objectId: "9007199254741014" };
  const exclusion = {
    sourceReference,
    name: "FX_CutinPlane",
    hierarchyPath: "Fixture/FX_CutinPlane",
    reasonCode: "PRESENTATION_SHADER_OR_MATERIAL",
    evidence: [
      `exact source renderer reference ${sourceReference.bundleSha256}:${sourceReference.serializedFile.toLowerCase()}:${sourceReference.objectId}`,
      "source hierarchy Fixture/FX_CutinPlane",
      "source renderer is in an FX/camera/cutin/presentation branch",
      "source material is explicitly effect-scoped: FX_Cutin_Leaf",
      `exact source material reference ${sourceMaterialReference.bundleSha256}:${sourceMaterialReference.serializedFile.toLowerCase()}:${sourceMaterialReference.objectId}`,
      "source shader is an effect family: DSFX/FX_SHADER_AlphaBlend_Add",
      `exact source shader reference ${sourceShaderReference.bundleSha256}:${sourceShaderReference.serializedFile.toLowerCase()}:${sourceShaderReference.objectId}`,
      `exact source mesh reference ${sourceMeshReference.bundleSha256}:${sourceMeshReference.serializedFile.toLowerCase()}:${sourceMeshReference.objectId}`,
    ],
    sourceMesh: { file: "CAB-fx-mesh", pathId: "77", sourceReference: sourceMeshReference },
    materials: [{ name: "FX_Cutin_Leaf", sourceReference: sourceMaterialReference, shaderName: "DSFX/FX_SHADER_AlphaBlend_Add", shaderReference: sourceShaderReference }],
  };
  profile.assembly = {
    root: "Fixture",
    rendererOrder: ["FX_CutinPlane"],
    renderers: [{ name: exclusion.name, pathId: "77", sourceReference, hierarchyPath: exclusion.hierarchyPath, enabled: true, visible: true, rendererType: "MeshRenderer", mesh: { file: "CAB-fx-mesh", pathId: "77" }, meshSourceReference: sourceMeshReference, materialSlots: [{ slot: 0, material: { file: "CAB-fx-materials", pathId: sourceMaterialReference.objectId }, sourceMaterialReference }] }],
    attachments: {},
  };
  profile.excludedRenderers = [exclusion];
  profile.excludedChildRendererEvents = [{
    clip: "Fixture_Cafe_Idle", time: 0.25, action: "enable", sourceRendererReference: sourceReference, order: 7,
    reasonCode: "PRESENTATION_CHILD_RENDERER_EVENT", evidence: [`event target exactly matches excluded renderer ${sourceReference.bundleSha256}:${sourceReference.serializedFile.toLowerCase()}:${sourceReference.objectId}`],
  }];
  profile.childRendererEvents = [];
  profile.validation = {
    ...profile.validation,
    excludedRenderers: [exclusion],
    excludedChildRendererEvents: profile.excludedChildRendererEvents,
  };
  return profile;
}

function renderingProfileWithFxExclusion(functionName = 'AniEvt_InstantiateFx') {
  const profile = renderingProfile({ mouth: false });
  const bundleSha256 = '2'.repeat(64);
  const fxReference = (serializedFile, objectId) => ({ bundleSha256, serializedFile, objectId });
  const targetReference = fxReference('CAB-fx', '101');
  const transformReference = fxReference('CAB-fx', '102');
  const rendererReference = fxReference('CAB-fx', '103');
  const particleSystemReference = fxReference('CAB-fx', '104');
  const behaviourReference = fxReference('CAB-fx', '105');
  const meshReference = fxReference('CAB-fx', '106');
  const eventSourceReference = {
    bundleSha256: '3'.repeat(64), serializedFile: 'CAB-animation', objectId: '501',
  };
  const approvedMonoScriptReference = {
    bundleSha256: 'e1fb78acaa16173dcf2e50f28bc43d8e18ddbdc0717f89a892b0ce6eac9dec29',
    serializedFile: 'CAB-4e374e23f1bd4e7218b8fbcbec01546f', objectId: '460590081893560622',
  };
  const clip = 'Fixture_Cafe_Idle', time = 0.5, order = 3;
  const sourceKey = `${eventSourceReference.bundleSha256}:${eventSourceReference.serializedFile.toLowerCase()}:${eventSourceReference.objectId}`;
  const targetKey = `${targetReference.bundleSha256}:${targetReference.serializedFile.toLowerCase()}:${targetReference.objectId}`;
  const evidence = [
    `exact source AnimationClip ${sourceKey}`,
    `selected event is ${functionName} at ${clip} ${time}s (source order ${order})`,
    `exact target PPtr resolves to ${targetKey}`,
    'exact FX target source reference and target graph are source-pinned',
    'complete Transform traversal covered 1 GameObjects',
    'all target graph renderers are ParticleSystemRenderer components',
    'every ParticleSystemRenderer mesh/material PPtr is recorded',
    `approved MonoScript source reference ${approvedMonoScriptReference.bundleSha256}:${approvedMonoScriptReference.serializedFile}:${approvedMonoScriptReference.objectId}`,
    'all serialized MonoBehaviour field schemas match the pinned source census',
    'target graph contains no renderer, mesh, material, or transform identity shared with selected core character content',
  ];
  const proof = {
    schemaVersion: 1,
    policyVersion: 'chibi-particle-only-instantiate-fx-v2',
    eventSourceReference,
    clip,
    time,
    order,
    function: functionName,
    targetReference,
    completeGraph: true,
    gameObjectReferences: [targetReference],
    transformReferences: [transformReference],
    componentReferences: [
      { sourceReference: transformReference, type: 'Transform' },
      { sourceReference: rendererReference, type: 'ParticleSystemRenderer' },
      { sourceReference: particleSystemReference, type: 'ParticleSystem' },
      { sourceReference: behaviourReference, type: 'MonoBehaviour' },
    ],
    particleRendererReferences: [rendererReference],
    approvedMonoScriptReferences: [approvedMonoScriptReference],
    rendererAssets: [{
      rendererReference,
      meshReference: {
        pointer: { file: meshReference.serializedFile, pathId: meshReference.objectId },
        fileID: 0, identityResolved: true, objectResolved: true, sourceReference: meshReference,
      },
      materialReferences: [],
    }],
    disjointFromCore: true,
    reasonCode: 'SOURCE_PARTICLE_ONLY_FX_TARGET',
    evidence,
  };
  const excludedEvent = {
    eventSourceReference, clip, time, order,
    function: functionName, targetReference,
    reasonCode: 'PRESENTATION_FX_INSTANTIATION', evidence,
  };
  profile.fxExclusionProofs = [proof];
  profile.excludedFxInstantiationEvents = [excludedEvent];
  profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
  profile.validation.excludedFxInstantiationEvents = structuredClone(profile.excludedFxInstantiationEvents);
  return profile;
}

function auditedPresentationExclusionProfile({
  rendererName,
  materialName,
  shaderName,
  hierarchyPath = `Fixture/${rendererName}`,
  builtinQuad = false,
  reasonCode = builtinQuad ? "PRESENTATION_MESH_10210_OR_HELPER" : "PRESENTATION_SHADER_OR_MATERIAL",
}) {
  const profile = renderingProfileWithPresentationExclusion();
  const exclusion = profile.excludedRenderers[0];
  const sourceMaterialReference = exclusion.materials[0].sourceReference;
  const sourceShaderReference = exclusion.materials[0].shaderReference;
  const sourceReference = exclusion.sourceReference;
  exclusion.name = rendererName;
  exclusion.hierarchyPath = hierarchyPath;
  exclusion.reasonCode = reasonCode;
  exclusion.materials[0].name = materialName;
  exclusion.materials[0].shaderName = shaderName;
  if (builtinQuad) {
    const builtinResource = {
      kind: "unity-builtin-resource",
      guid: "00000000000000000e00000000000000",
      file: "unity default resources",
      pathId: "10210",
      name: "Quad",
    };
    exclusion.sourceMesh = {
      file: "unity default resources",
      pathId: "10210",
      externalGuid: builtinResource.guid,
      builtinResource,
      sourceReference: null,
    };
    profile.assembly.renderers[0].mesh = structuredClone(exclusion.sourceMesh);
    profile.assembly.renderers[0].meshSourceReference = null;
  }
  exclusion.evidence = [
    `exact source renderer reference ${sourceReference.bundleSha256}:${sourceReference.serializedFile.toLowerCase()}:${sourceReference.objectId}`,
    `source hierarchy ${hierarchyPath}`,
    "source renderer is in an FX/camera/cutin/presentation branch",
    "source hierarchy identifies a presentation role",
    ...(builtinQuad ? ["source mesh is the exact Unity built-in Quad"] : []),
    `source material is explicitly effect-scoped: ${materialName}`,
    `exact source material reference ${sourceMaterialReference.bundleSha256}:${sourceMaterialReference.serializedFile.toLowerCase()}:${sourceMaterialReference.objectId}`,
    `source shader is an effect family: ${shaderName}`,
    `exact source shader reference ${sourceShaderReference.bundleSha256}:${sourceShaderReference.serializedFile.toLowerCase()}:${sourceShaderReference.objectId}`,
    ...(!builtinQuad ? [`exact source mesh reference ${exclusion.sourceMesh.sourceReference.bundleSha256}:${exclusion.sourceMesh.sourceReference.serializedFile.toLowerCase()}:${exclusion.sourceMesh.sourceReference.objectId}`] : []),
  ];
  profile.assembly.renderers[0].name = rendererName;
  profile.assembly.renderers[0].hierarchyPath = hierarchyPath;
  profile.validation.excludedRenderers = [exclusion];
  return profile;
}

function inertNullPointerPresentationProfile() {
  const profile = renderingProfile({ mouth: false });
  const sourceReference = { ...profile.renderers[0].sourceReference, objectId: "9007199254741015" };
  const nullPointer = { file: sourceReference.serializedFile, pathId: "0" };
  const exclusion = {
    sourceReference,
    name: "Box001",
    hierarchyPath: "Fixture/Box001",
    reasonCode: "PRESENTATION_MESH_10210_OR_HELPER",
    evidence: [
      `exact source renderer reference ${sourceReference.bundleSha256}:${sourceReference.serializedFile.toLowerCase()}:${sourceReference.objectId}`,
      `source mesh is the exact null pointer ${sourceReference.serializedFile.toLowerCase()}:0`,
      `every source material slot is the exact null pointer ${sourceReference.serializedFile.toLowerCase()}:0`,
    ],
    sourceMesh: { ...nullPointer, sourceReference: null },
    materials: [{ name: "(exact null material pointer)", sourceReference: null, shaderName: null, shaderReference: null }],
  };
  profile.assembly = {
    root: "Fixture",
    rendererOrder: [exclusion.name],
    renderers: [{
      name: exclusion.name, pathId: "78", sourceReference, hierarchyPath: exclusion.hierarchyPath,
      enabled: true, visible: true, rendererType: "SkinnedMeshRenderer", mesh: structuredClone(nullPointer), meshSourceReference: null,
      materialSlots: [{ slot: 0, material: structuredClone(nullPointer), sourceMaterialReference: null }],
    }],
    attachments: {},
  };
  profile.excludedRenderers = [exclusion];
  profile.validation = { ...profile.validation, excludedRenderers: [exclusion] };
  return profile;
}

const projectMxSourceReference = {
  bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c",
  serializedFile: "CAB-428091522b4007f213bf16532c4528a1",
  objectId: "-2179428789015729742",
};
const projectMxColorlessSourceMeshReference = {
  bundleSha256: "66025c332131b4488a04cb314b4598168f213b7df0ba6e58c8695543c7b083b8",
  serializedFile: "CAB-ada26f5ac0ed21c4234486b090f5cf91",
  objectId: "7429403255582981804",
};
const projectMxColorlessSourceMeshEvidence = {
  sourceReference: projectMxColorlessSourceMeshReference,
  vertexCount: 10256,
  subMeshVertexCounts: [9392, 864],
  colorChannelDimension: 0,
  colorsPresent: false,
};
const projectMxColorNormalization = {
  sourceMeshReference: projectMxColorlessSourceMeshReference,
  sourceVertexCount: 10256,
  sourceSubMeshVertexCounts: [9392, 864],
  sourceColorChannelDimension: 0,
  sourceColorsPresent: false,
  defaultValue: [0, 0, 0, 1],
};
const projectMxSenaColorlessSourceMeshReference = {
  bundleSha256: "12145f231b3c8b093c728296b771f4ae89a1fdd9e98f3afc915668fcd77591c5",
  serializedFile: "CAB-74b254d25a0b77afb604cb26c86ff7a2",
  objectId: "-4368492268259368080",
};
const projectMxSenaColorlessSourceMeshEvidence = {
  sourceReference: projectMxSenaColorlessSourceMeshReference,
  vertexCount: 9203,
  subMeshVertexCounts: [9203],
  indexCount: 22653,
  colorChannelDimension: 0,
  colorsPresent: false,
};
const projectMxSenaColorNormalization = {
  sourceMeshReference: projectMxSenaColorlessSourceMeshReference,
  sourceVertexCount: 9203,
  sourceSubMeshVertexCounts: [9203],
  sourceIndexCount: 22653,
  sourceColorChannelDimension: 0,
  sourceColorsPresent: false,
  defaultValue: [0, 0, 0, 1],
};
const projectMxProgramBlobSha256 = "962e3b88b0cc42a36e31e8eb2ba538d3cc571d37f4bec4aca1b30e14a6927e0b";
const projectMxFingerprint = "dba2503cda8be6508b161525ab1202a9187f93c8924716efe6f3d061a4ff439b";
const projectMxShaderKeywords = ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "_ADDITIONAL_LIGHTS", "DEBUG_DISPLAY", "FOG_LINEAR", "FOG_EXP", "FOG_EXP2", "_DAMAGE_0", "_GLOW_0", "_DITHER_HORIZONTAL_LINES", "OUTLINE_RIM_LIGHT_POINT", "OUTLINE_RIM_LIGHT_SPOT", "_GRAYSCALE_MODE", "_CHAR_CUTOUT_MODE"];
const projectMxRequiredProperties = ["_DamageON", "_Color", "_mainTex", "_sourceTex", "_NoiseTex", "_CrushScale", "_NoiseDir", "_DmgCol", "_NoiseColStrong", "_Damage", "_FireCol", "_FireBackCol_Str", "_FireValue", "_Fire", "_ShadowThreshold", "_ShadowStrong", "_LightValue", "_LightStrong", "_SpecStrong", "_ShadowTint", "_SpecColor", "_FakeLightDir", "_AdditionalLightStrength", "_AdditionalLightSharpness", "_UseGlow", "_GlowMaskColor0", "_GlowStrictness0", "_GlowTint0", "_GlowStrength0", "_OutlineTint", "_OutlineSolidColorTint", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_GrayBrightness", "_IsDither", "_DitherThreshold"];
const projectMxPassSpecs = {
  forward: { stateName: "ForwardLit", passIndex: 0, blobIndex: 32, parameterBlobIndex: 0, parameterRecordSha256: "1fd7d08c08cddbfd430fcce54986154a9a2a05611c22ed341936cd2d65c3f531", programHash: "8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0", programRecordSha256: "6493a59384085e9600cf22bbe3577b99a8f24801a9dd14823e1eadeec6f37bab", programDataLength: 9117, keywordIndices: [], keywordNames: [], attributes: ["POSITION", "NORMAL", "TEXCOORD_0"], uniforms: ["_WorldSpaceCameraPos", "hlslcc_mtx4x4unity_MatrixVP", "_MxCharShadowTone", "_ShadowTint", "_mainTex_ST", "_FakeLightDir", "_MxCharLightTone", "_MxCharLightData", "_ShadowThreshold", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_Color", "_ShadowStrong", "_SpecColor", "_LightValue", "_LightStrong", "_SpecStrong", "_FireCol", "_FireBackCol_Str", "_FireValue", "_Fire", "_mainTex", "_sourceTex"], culling: 2, colorMask: 15 },
  glow: { stateName: "ForwardLit", passIndex: 0, blobIndex: 34, parameterBlobIndex: 2, parameterRecordSha256: "eee4f7d62f87181a65c432811bc8f70278611bde7cdb34db471b2f71f39872a3", programHash: "7a52de32c3c7fcd54216ed9f9b542b93d56b2cecc687d524c5d46dff772bda61", programRecordSha256: "649300d147f68a8028da9cdf7518e59b06f18bb1bec00870e9d4c42cc28d4199", programDataLength: 9679, keywordIndices: [10], keywordNames: ["_GLOW_0"], attributes: ["POSITION", "NORMAL", "TEXCOORD_0"], uniforms: ["_WorldSpaceCameraPos", "hlslcc_mtx4x4unity_MatrixVP", "_MxCharShadowTone", "_ShadowTint", "_mainTex_ST", "_FakeLightDir", "_MxCharLightTone", "_MxCharLightData", "_ShadowThreshold", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_Color", "_ShadowStrong", "_SpecColor", "_LightValue", "_LightStrong", "_SpecStrong", "_FireCol", "_FireBackCol_Str", "_FireValue", "_Fire", "_mainTex", "_sourceTex", "_GlowMaskColor0", "_GlowStrictness0", "_GlowTint0", "_GlowStrength0"], culling: 2, colorMask: 15 },
  outline: { stateName: "Outline", passIndex: 1, blobIndex: 104, parameterBlobIndex: 80, parameterRecordSha256: "93e5c67bd74028d7dcc658e2ef1b6e8fdd5a335b14ba86a64a0f49751658c1e9", programHash: "a277ed38c25399804b406db92436fa1f6e174e14cd520e80ad93c5af0fa6b703", programRecordSha256: "476574cf56ad6f44e2f032e4f2168940da9aaa05d0bf508374e84433794ca026", programDataLength: 5141, keywordIndices: [], keywordNames: [], attributes: ["POSITION", "COLOR_0", "TANGENT", "TEXCOORD_0"], uniforms: ["_MainLightColor", "_ScreenParams", "hlslcc_mtx4x4glstate_matrix_projection", "hlslcc_mtx4x4unity_MatrixInvV", "hlslcc_mtx4x4unity_MatrixVP", "_OutlineTint", "_OutlineZCorrection", "_mainTex"], culling: 1, colorMask: 15 },
  solidOutline: { stateName: "Solid Color Outline", passIndex: 2, blobIndex: 180, parameterBlobIndex: 176, parameterRecordSha256: "81b579f997a0f2ebcbafe8cfee65f85e80daec6676a2a8539acb2f28d5c1841e", programHash: "caddccda8439d960e4fc999a1e985816425f4bf71f6c5c7d5f39b23a3151b5a2", programRecordSha256: "cde8f0a6c8770da24e241fcba0b378f97a8b2fee1ac85636b4f812e33f4e095f", programDataLength: 5384, keywordIndices: [], keywordNames: [], attributes: ["POSITION", "COLOR_0", "TANGENT"], uniforms: ["_MainLightColor", "_ScreenParams", "hlslcc_mtx4x4glstate_matrix_projection", "hlslcc_mtx4x4unity_MatrixInvV", "hlslcc_mtx4x4unity_MatrixVP", "_AdditionalLightSharpness", "_AdditionalLightStrength", "_OutlineTint", "_OutlineZCorrection", "_OutlineSolidColorTint", "_DitherThreshold"], culling: 1, colorMask: 15 },
  shadow: { stateName: "ShadowCaster", passIndex: 3, blobIndex: 193, parameterBlobIndex: 192, parameterRecordSha256: "7776e03ce4d1ca4c97c6cfb57ed3ee6bf5800c7ad7c62f29f0b68e8d93f10b35", programHash: "c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0", programRecordSha256: "52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46", programDataLength: 4273, keywordIndices: [], keywordNames: [], attributes: ["POSITION", "NORMAL"], uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier"], culling: 2, colorMask: 15 },
  depth: { stateName: "DepthOnly", passIndex: 4, blobIndex: 195, parameterBlobIndex: 194, parameterRecordSha256: "d80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532", programHash: "5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513", programRecordSha256: "36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0", programDataLength: 2766, keywordIndices: [], keywordNames: [], attributes: ["POSITION"], uniforms: ["hlslcc_mtx4x4unity_MatrixVP"], culling: 2, colorMask: 0 },
};

function projectMxGlsl(attributes, uniforms) {
  const sourceAttribute = (attribute) => attribute === "POSITION" ? "in_POSITION0" : attribute === "NORMAL" ? "in_NORMAL0" : attribute === "TEXCOORD_0" ? "in_TEXCOORD0" : attribute === "TANGENT" ? "in_TANGENT0" : "in_COLOR0";
  return ["#version 300 es", "#ifdef VERTEX", ...attributes.map((attribute) => `in mediump vec4 ${sourceAttribute(attribute)};`), ...uniforms.map((uniform) => `uniform mediump vec4 ${uniform};`), "#endif", "#ifdef FRAGMENT", "void main() {}", "#endif"].join("\n");
}

function projectMxPass(name, spec) {
  return {
    pass: name, stateName: spec.stateName, subShaderIndex: 0, passIndex: spec.passIndex, stage: "vertex", platform: 9, gpuProgramType: 4,
    blobIndex: spec.blobIndex, parameterBlobIndex: spec.parameterBlobIndex, parameterRecordSha256: spec.parameterRecordSha256,
    keywordIndices: spec.keywordIndices, keywordNames: spec.keywordNames, programHash: spec.programHash, programDataSha256: spec.programHash,
    programDataLength: spec.programDataLength, programRecordSha256: spec.programRecordSha256, usesNoiseTexture: false,
    glsl: projectMxGlsl(spec.attributes, spec.uniforms), requiredAttributes: spec.attributes, requiredUniforms: spec.uniforms,
    renderState: { zWrite: 1, zTest: 4, culling: spec.culling, colorMask: spec.colorMask, depthOnly: name === "depth", sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0 },
  };
}

function projectMxProfile({ variant = "forward", tamperedPass = false, missingSource = false, wrongAttribute = false, includeInactiveNoise = false } = {}) {
  const rendererReference = { bundleSha256: "a".repeat(64), serializedFile: "CAB-projectmx", objectId: "7" };
  const materialReference = { bundleSha256: "b".repeat(64), serializedFile: "CAB-materials", objectId: "17" };
  const mainReference = { bundleSha256: "c".repeat(64), serializedFile: "CAB-projectmx-textures", objectId: "29" };
  const sourceReference = { ...mainReference, objectId: "31" };
  const passes = Object.fromEntries(Object.entries(projectMxPassSpecs).map(([name, spec]) => [name, projectMxPass(name, spec)]));
  if (tamperedPass) passes[variant].programHash = "0".repeat(64);
  const extraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: "2021.3", fingerprint: projectMxFingerprint,
    sourceReference: structuredClone(projectMxSourceReference), compressedBlobSha256: projectMxProgramBlobSha256,
    shaderName: "ProjectMX/WeaponTest1Damage", shaderKeywordNames: projectMxShaderKeywords,
    activeVariant: variant, activeKeywordNames: variant === "glow" ? ["_GLOW_0"] : [],
    requiredProperties: projectMxRequiredProperties, requiredTextureProperties: ["_mainTex", "_sourceTex"], passes,
  };
  const textures = [
    { name: "_mainTex", texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference },
    { name: "_sourceTex", texture: { file: sourceReference.serializedFile, pathId: sourceReference.objectId }, textureReference: sourceReference },
  ];
  if (includeInactiveNoise) {
    const noiseReference = { ...mainReference, objectId: "37" };
    textures.unshift({ name: "_NoiseTex", texture: { file: noiseReference.serializedFile, pathId: noiseReference.objectId }, textureReference: noiseReference });
  }
  if (missingSource) textures.shift();
  const floats = { _DamageON: 0, _Damage: 0, _Fire: 0, _IsDither: 0, _UseGlow: variant === "glow" ? 1 : 0, _GlowStrictness0: 1, _GlowStrength0: 1 };
  const colors = { _Color: { r: 1, g: .8, b: .6, a: 1 }, _OutlineTint: { r: 1, g: 1, b: 1, a: 1 }, _OutlineSolidColorTint: { r: 1, g: 1, b: 1, a: 1 }, _GlowMaskColor0: { r: 1, g: 1, b: 1, a: 1 }, _GlowTint0: { r: 1, g: 1, b: 1, a: 1 } };
  const slot = {
    slot: 0, sourceMaterialReference: materialReference, sourceMaterialName: "Fixture_Weapon", sourceShaderReference: structuredClone(projectMxSourceReference),
    sourceShaderName: "ProjectMX/WeaponTest1Damage", sourceShaderParsedName: "ProjectMX/WeaponTest1Damage", shaderProgramBlobSha256: projectMxProgramBlobSha256,
    adapterId: "projectmx-weapon-test1-damage", projectMxShaderExtraction: extraction,
    materialProperties: { floats, ints: {}, colors, keywords: variant === "glow" ? ["_GLOW_0"] : [], textures, resolvedTextures: textures.map((item) => ({ property: item.name, name: item.name, width: 1, height: 1, sourceReference: item.textureReference })) },
    adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: [1, .8, .6, 1] },
    renderState: { sourceQueue: 2000, layer: "opaque", alphaMode: "OPAQUE", depthWrite: true, depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false, blend: { source: 1, destination: 0, sourceAlpha: 1, destinationAlpha: 0, operation: 0, operationAlpha: 0 }, polygonOffsetFactor: 0, polygonOffsetUnits: 0 },
    glb: null,
  };
  if (wrongAttribute) extraction.passes.outline.requiredAttributes = ["POSITION", "TANGENT", "COLOR_0"];
  return {
    schemaVersion: 2, profileVersion: CHIBI_RENDERING_PROFILE_VERSION, policyVersion: CHIBI_RENDERING_POLICY_VERSION, adapterVersion: CHIBI_SHADER_ADAPTER_VERSION, sourceIdentity: "fixture", dependencyFingerprint: "fixture-fingerprint",
    sourcePrefab: { path: "Assets/Fixture.prefab", reference: rendererReference }, assembly: null,
    renderers: [{ sourceReference: rendererReference, name: "Fixture_Weapon", hierarchyPath: "Fixture/Body", rendererType: "SkinnedMeshRenderer", defaultVisible: true,
      sourceMesh: { file: "CAB-projectmx", pathId: "1", sourceReference: { bundleSha256: "d".repeat(64), serializedFile: "CAB-projectmx", objectId: "1" } }, glbNodeIndex: null, materialSlots: [slot] }],
    childRendererEvents: [], excludedRenderers: [], excludedChildRendererEvents: [], fxExclusionProofs: [], excludedFxInstantiationEvents: [], mouth: null, drawSequence: [`${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}`], validation: { valid: true, unresolved: [], excludedRenderers: [], excludedChildRendererEvents: [], fxExclusionProofs: [], excludedFxInstantiationEvents: [] },
  };
}

function hifumiProjectMxProfile({ tamperInactiveNoise = false, dynamicDamage = false, tamperColorEvidence = false } = {}) {
  const profile = projectMxProfile({ includeInactiveNoise: true });
  profile.renderers[0].sourceMesh = {
    file: projectMxColorlessSourceMeshReference.serializedFile,
    pathId: projectMxColorlessSourceMeshReference.objectId,
    sourceReference: structuredClone(projectMxColorlessSourceMeshReference),
    projectMxSourceMeshEvidence: structuredClone(projectMxColorlessSourceMeshEvidence),
  };
  if (tamperColorEvidence) profile.renderers[0].sourceMesh.projectMxSourceMeshEvidence.colorsPresent = true;
  const configureSlot = (slot, slotIndex, sourceMaterialName, materialObjectId, mainObjectId, sourceObjectId, noiseObjectId) => {
    slot.slot = slotIndex;
    slot.sourceMaterialName = sourceMaterialName;
    slot.sourceMaterialReference = { ...slot.sourceMaterialReference, objectId: materialObjectId };
    const objectIds = { _mainTex: mainObjectId, _sourceTex: sourceObjectId, _NoiseTex: noiseObjectId };
    for (const texture of slot.materialProperties.textures) {
      const objectId = objectIds[texture.name];
      texture.texture.pathId = objectId;
      texture.textureReference = { ...texture.textureReference, objectId };
    }
    slot.materialProperties.resolvedTextures = slot.materialProperties.textures.map(texture => ({
      property: texture.name, name: texture.name, width: 1, height: 1, sourceReference: texture.textureReference,
    }));
    if (tamperInactiveNoise && slotIndex === 0) {
      const noise = slot.materialProperties.textures.find(texture => texture.name === "_NoiseTex");
      noise.texture.pathId = "999";
    }
    if (dynamicDamage && slotIndex === 0) slot.materialProperties.floats._DamageON = 1;
  };
  configureSlot(profile.renderers[0].materialSlots[0], 0, "CH0058_Tank_01", "170", "29", "31", "37");
  const second = structuredClone(profile.renderers[0].materialSlots[0]);
  configureSlot(second, 1, "Tank_Crusader_01_2", "190", "41", "43", "47");
  profile.renderers[0].materialSlots.push(second);
  return profile;
}

function senaProjectMxProfile({ tamperColorEvidence = false, tamperSourceReference = false } = {}) {
  const profile = projectMxProfile();
  profile.renderers[0].sourceMesh = {
    file: projectMxSenaColorlessSourceMeshReference.serializedFile,
    pathId: projectMxSenaColorlessSourceMeshReference.objectId,
    sourceReference: structuredClone(projectMxSenaColorlessSourceMeshReference),
    projectMxSourceMeshEvidence: structuredClone(projectMxSenaColorlessSourceMeshEvidence),
  };
  if (tamperColorEvidence) profile.renderers[0].sourceMesh.projectMxSourceMeshEvidence.vertexCount = 9202;
  if (tamperSourceReference) profile.renderers[0].sourceMesh.sourceReference.objectId = "-1";
  return profile;
}

function glbWithProjectMxRenderer({ includeMaterialUnlit = false, includeUnrelatedUnlit = false, materialNames = ["Fixture_Weapon"], vertexCounts = null, indexCounts = null, indexValues = null, attributeCountOverrides = null, primitiveMaterialIndices = null, primitiveModes = null, omitColor = false, wrongColor = false, rawBaseColor = false } = {}) {
  const counts = vertexCounts ?? materialNames.map(() => 3);
  if (counts.length !== materialNames.length || counts.some((count) => !Number.isInteger(count) || count < 3)) throw new Error("invalid ProjectMX fixture vertex counts");
  if (indexCounts !== null && (indexCounts.length !== materialNames.length || indexCounts.some((count) => !Number.isInteger(count) || count < 3 || count % 3 !== 0))) throw new Error("invalid ProjectMX fixture index counts");
  const binaryParts = [], bufferViews = [], accessors = [];
  let offset = 0;
  const appendAccessor = (bytes, componentType, count, type) => {
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length });
    binaryParts.push(bytes);
    offset += bytes.length;
    accessors.push({ bufferView: bufferViews.length - 1, componentType, count, type });
    return accessors.length - 1;
  };
  const primitives = materialNames.map((_, material) => {
    const count = counts[material];
    const overrides = attributeCountOverrides?.[material] ?? {};
    const positions = new Float32Array((overrides.POSITION ?? count) * 3), normals = new Float32Array((overrides.NORMAL ?? count) * 3);
    const uvs = new Float32Array((overrides.TEXCOORD_0 ?? count) * 2), tangents = new Float32Array((overrides.TANGENT ?? count) * 4);
    const colors = new Float32Array((overrides.COLOR_0 ?? count) * 4);
    const indexCount = indexCounts?.[material] ?? 3;
    const indices = new Uint32Array(indexCount);
    for (let index = 0; index < indices.length; index += 1) indices[index] = index % count;
    for (const [index, value] of (indexValues?.[material] ?? []).entries()) if (index < indices.length) indices[index] = value;
    for (let vertex = 0; vertex < count; vertex += 1) {
      positions[vertex * 3] = vertex % 2; positions[vertex * 3 + 1] = Math.floor(vertex / 2) % 2;
      normals[vertex * 3 + 2] = 1;
      uvs[vertex * 2] = vertex % 2; uvs[vertex * 2 + 1] = Math.floor(vertex / 2) % 2;
      tangents[vertex * 4] = 1; tangents[vertex * 4 + 3] = 1;
      colors[vertex * 4] = wrongColor ? 1 : 0; colors[vertex * 4 + 1] = wrongColor ? 1 : 0;
      colors[vertex * 4 + 2] = wrongColor ? 1 : 0; colors[vertex * 4 + 3] = 1;
    }
    const attributes = {
      POSITION: appendAccessor(Buffer.from(positions.buffer), 5126, positions.length / 3, "VEC3"),
      NORMAL: appendAccessor(Buffer.from(normals.buffer), 5126, normals.length / 3, "VEC3"),
      TEXCOORD_0: appendAccessor(Buffer.from(uvs.buffer), 5126, uvs.length / 2, "VEC2"),
      TANGENT: appendAccessor(Buffer.from(tangents.buffer), 5126, tangents.length / 4, "VEC4"),
    };
    if (!omitColor) attributes.COLOR_0 = appendAccessor(Buffer.from(colors.buffer), 5126, colors.length / 4, "VEC4");
    return {
      attributes,
      indices: appendAccessor(Buffer.from(indices.buffer), 5125, indices.length, "SCALAR"),
      ...(primitiveModes?.[material] === undefined ? {} : { mode: primitiveModes[material] }),
      material: primitiveMaterialIndices?.[material] ?? material,
    };
  });
  const binary = Buffer.concat(binaryParts);
  const document = {
    asset: { version: "2.0" }, buffers: [{ byteLength: binary.length }], bufferViews, accessors,
    scenes: [{ nodes: [0] }], scene: 0, nodes: [{ name: "RootNode", children: [1] }, { name: "Fixture", children: [2] }, { name: "Body", mesh: 0, skin: 0 }], skins: [{ joints: [0] }],
    meshes: [{ primitives }],
    ...(includeMaterialUnlit || includeUnrelatedUnlit ? { extensionsUsed: ["KHR_materials_unlit"] } : {}),
    materials: [
      ...materialNames.map(name => ({ name, alphaMode: "OPAQUE", ...(includeMaterialUnlit ? { extensions: { KHR_materials_unlit: {} } } : {}), ...(rawBaseColor ? { pbrMetallicRoughness: { baseColorTexture: { index: 0 } } } : {}) })),
      ...(includeUnrelatedUnlit ? [{ name: "Unrelated_Unlit", extensions: { KHR_materials_unlit: {} } }] : []),
    ], textures: [], images: [], samplers: [], animations: [],
  };
  const source = Buffer.from(JSON.stringify(document));
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length);
  output.write("glTF"); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8); output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
  const binaryOffset = 20 + json.length; output.writeUInt32LE(binary.length, binaryOffset); output.writeUInt32LE(0x004e4942, binaryOffset + 4); binary.copy(output, binaryOffset + 8);
  return output;
}

test("accepts Hifumi's two ProjectMX slots with serialized but inactive NoiseTex evidence", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-projectmx-hifumi-"));
  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "source.png");
    const profile = hifumiProjectMxProfile();
    const slots = profile.renderers[0].materialSlots;
    await writeFile(input, glbWithProjectMxRenderer({ materialNames: slots.map(slot => slot.sourceMaterialName), vertexCounts: [9392, 864], omitColor: true }));
    await writeFile(texture, png);
    await writeFile(config, JSON.stringify({
      sourceIdentity: "ch0058", exportClips: [], renderingProfile: profile,
      sourceTextureExports: slots.flatMap(slot => slot.materialProperties.textures.filter(item => item.name !== "_NoiseTex").map(item => ({
        sourceMaterialReference: slot.sourceMaterialReference, textureProperty: item.name, textureReference: item.textureReference, path: texture,
      }))),
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    assert.equal((await validateGlb(output)).valid, true);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.scenes[0].extras.chibi.renderingProfileDiagnostics.skinSkeletonMetadataVersion, CHIBI_SKIN_SKELETON_METADATA_VERSION);
    assert.deepEqual(document.scenes[0].extras.chibi.renderingProfileDiagnostics.skinSkeletonRepairs, []);
    for (const [index, slot] of slots.entries()) {
      const material = document.materials[index], chibi = material.extras.chibi;
      assert.equal(chibi.adapterId, "projectmx-weapon-test1-damage");
      assert.equal(chibi.projectMxShaderExtraction.activeVariant, "forward");
      assert.equal(chibi.projectMxMaterialProperties.textures.some(item => item.name === "_NoiseTex"), true);
      assert.equal(chibi.projectMxTextures.noiseTex, undefined);
      assert.deepEqual(chibi.projectMxColorNormalization, projectMxColorNormalization);
      assert.equal(material.extensions?.KHR_materials_unlit, undefined);
      assert.equal(material.pbrMetallicRoughness.baseColorTexture.index, chibi.projectMxTextures.mainTex.index);
      const primitive = document.meshes[0].primitives[index];
      const colorIndex = primitive.attributes.COLOR_0;
      assert.equal(document.accessors[colorIndex].componentType, 5126);
      assert.equal(document.accessors[colorIndex].type, "VEC4");
      assert.equal(document.accessors[colorIndex].count, [9392, 864][index]);
      assert.deepEqual(readDocumentAccessor(document, readGlbBinary(await readFile(output)), colorIndex)[0], [0, 0, 0, 1]);
    }
    assert.deepEqual(document.scenes[0].extras.chibi.renderingProfile.renderers[0].sourceMesh.projectMxSourceMeshEvidence, projectMxColorlessSourceMeshEvidence);
    assert.deepEqual(document.meshes[0].primitives.map(primitive => primitive.material), [0, 1]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects the stale v9 embedded rendering-policy identity", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-stale-v9-policy-"));
  try {
    const profile = renderingProfile({ mouth: false });
    profile.policyVersion = "chibi-rendering-policy-v9";
    const input = path.join(root, "stale-policy.glb");
    await writeFile(input, glbWithEmbeddedRenderingProfile(profile));
    await assert.rejects(
      () => validateGlb(input),
      /Embedded rendering profile version or policy identity is missing or tampered\./,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails closed for Hifumi inactive NoiseTex tampering and dynamic damage", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
  const cases = [
    { label: "inactive-noise", profile: hifumiProjectMxProfile({ tamperInactiveNoise: true }), expected: /serialized _NoiseTex pointer does not match its exact source identity|has no exact _NoiseTex identity/ },
    { label: "dynamic-damage", profile: hifumiProjectMxProfile({ dynamicDamage: true }), expected: /enables unsupported interactive _DamageON behavior/ },
    { label: "color-evidence", profile: hifumiProjectMxProfile({ tamperColorEvidence: true }), expected: /unverified source-missing COLOR_0 evidence|no exact source-missing COLOR_0 evidence/ },
    { label: "color-position-count", profile: hifumiProjectMxProfile(), fixture: { vertexCounts: [9391, 864], omitColor: true }, expected: /POSITION vertex count does not match exact source submesh evidence/ },
    { label: "color-data", profile: hifumiProjectMxProfile(), fixture: { vertexCounts: [9392, 864], wrongColor: true }, expected: /does not preserve the exact Unity default COLOR_0 value/ },
  ];
  for (const { label, profile, fixture, expected } of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-projectmx-hifumi-${label}-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "source.png");
      const slots = profile.renderers[0].materialSlots;
      await writeFile(input, glbWithProjectMxRenderer({ materialNames: slots.map(slot => slot.sourceMaterialName), ...(fixture ?? { vertexCounts: [9392, 864], omitColor: true }) }));
      await writeFile(texture, png);
      await writeFile(config, JSON.stringify({
        sourceIdentity: "ch0058", exportClips: [], renderingProfile: profile,
        sourceTextureExports: slots.flatMap(slot => slot.materialProperties.textures.filter(item => item.name !== "_NoiseTex").map(item => ({
          sourceMaterialReference: slot.sourceMaterialReference, textureProperty: item.name, textureReference: item.textureReference, path: texture,
        }))),
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, expected);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("accepts Sena ProjectMX COLOR_0 normalization only for the exact proven mesh", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-projectmx-sena-"));
  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "source.png");
    const profile = senaProjectMxProfile();
    const slot = profile.renderers[0].materialSlots[0];
    await writeFile(input, glbWithProjectMxRenderer({ vertexCounts: [6979], indexCounts: [22653], primitiveModes: [4], omitColor: true }));
    await writeFile(texture, png);
    await writeFile(config, JSON.stringify({
      sourceIdentity: "sena", exportClips: [], renderingProfile: profile,
      sourceTextureExports: slot.materialProperties.textures.map((item) => ({
        sourceMaterialReference: slot.sourceMaterialReference, textureProperty: item.name, textureReference: item.textureReference, path: texture,
      })),
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    assert.equal((await validateGlb(output)).valid, true);
    const bytes = await readFile(output);
    const document = readGlbJson(bytes), binary = readGlbBinary(bytes);
    const material = document.materials[0], chibi = material.extras.chibi;
    assert.deepEqual(chibi.projectMxColorNormalization, projectMxSenaColorNormalization);
    assert.deepEqual(document.scenes[0].extras.chibi.renderingProfile.renderers[0].sourceMesh.projectMxSourceMeshEvidence, projectMxSenaColorlessSourceMeshEvidence);
    const colorIndex = document.meshes[0].primitives[0].attributes.COLOR_0;
    assert.equal(document.accessors[colorIndex].count, 6979);
    assert.deepEqual(readDocumentAccessor(document, binary, colorIndex)[0], [0, 0, 0, 1]);
    assert.equal(document.scenes[0].extras.chibi.renderingProfile.renderers[0].sourceMesh.projectMxSourceMeshEvidence.vertexCount, 9203);
    assert.equal(document.scenes[0].extras.chibi.renderingProfile.renderers[0].sourceMesh.projectMxSourceMeshEvidence.indexCount, 22653);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails closed for Sena COLOR_0 evidence tampering and unknown missing-color meshes", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
  const unknownProfile = senaProjectMxProfile();
  unknownProfile.renderers[0].sourceMesh.sourceReference.objectId = "-1";
  delete unknownProfile.renderers[0].sourceMesh.projectMxSourceMeshEvidence;
  const rawSenaFixture = { vertexCounts: [6979], indexCounts: [22653], primitiveModes: [4], omitColor: true };
  const cases = [
    { label: "source-reference", profile: senaProjectMxProfile({ tamperSourceReference: true }), fixture: rawSenaFixture, expected: /unverified source-missing COLOR_0 evidence/ },
    { label: "source-count", profile: senaProjectMxProfile({ tamperColorEvidence: true }), fixture: rawSenaFixture, expected: /unverified source-missing COLOR_0 evidence|no exact source-missing COLOR_0 evidence/ },
    { label: "source-index-count", profile: (() => { const profile = senaProjectMxProfile(); profile.renderers[0].sourceMesh.projectMxSourceMeshEvidence.indexCount = 22652; return profile; })(), fixture: rawSenaFixture, expected: /unverified source-missing COLOR_0 evidence|no exact source-missing COLOR_0 evidence/ },
    { label: "unknown-source", profile: unknownProfile, fixture: rawSenaFixture, expected: /does not preserve COLOR_0 source data/ },
    { label: "index-range", profile: senaProjectMxProfile(), fixture: { ...rawSenaFixture, indexValues: [[6979, 0, 0]] }, expected: /out-of-range or non-integer index/ },
    { label: "attribute-count", profile: senaProjectMxProfile(), fixture: { ...rawSenaFixture, attributeCountOverrides: [{ NORMAL: 6978 }] }, expected: /mismatched non-color attribute counts/ },
    { label: "material-binding", profile: senaProjectMxProfile(), fixture: { ...rawSenaFixture, primitiveMaterialIndices: [1] }, expected: /no exact GLB primitive|exact GLB primitive\/material binding/ },
  ];
  for (const { label, profile, fixture, expected } of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-projectmx-sena-${label}-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "source.png");
      const slot = profile.renderers[0].materialSlots[0];
      await writeFile(input, glbWithProjectMxRenderer(fixture));
      await writeFile(texture, png);
      await writeFile(config, JSON.stringify({
        sourceIdentity: "sena", exportClips: [], renderingProfile: profile,
        sourceTextureExports: slot.materialProperties.textures.map((item) => ({
          sourceMaterialReference: slot.sourceMaterialReference, textureProperty: item.name, textureReference: item.textureReference, path: texture,
        })),
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, expected);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("binds exact ProjectMX static variants, source textures, tint, passes, and opaque state", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
  for (const variant of ["forward", "glow"]) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-projectmx-${variant}-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const mainTexture = path.join(root, "main.png"), sourceTexture = path.join(root, "source.png");
      await writeFile(input, glbWithProjectMxRenderer({ includeUnrelatedUnlit: true }));
      await writeFile(mainTexture, png);
      await writeFile(sourceTexture, png);
      const profile = projectMxProfile({ variant });
      const slot = profile.renderers[0].materialSlots[0];
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [
          { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_mainTex", textureReference: slot.materialProperties.textures[0].textureReference, path: mainTexture },
          { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_sourceTex", textureReference: slot.materialProperties.textures[1].textureReference, path: sourceTexture },
        ],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.equal(result.code, 0, result.stderr);
      const document = readGlbJson(await readFile(output));
      const material = document.materials[0], chibi = material.extras.chibi;
      assert.equal(material.alphaMode, "OPAQUE");
      assert.equal(material.doubleSided, false);
      assert.equal(material.extensions?.KHR_materials_unlit, undefined);
      assert.deepEqual(document.materials[1].extensions?.KHR_materials_unlit, {});
      assert.equal(document.extensionsUsed.includes("KHR_materials_unlit"), true);
      assert.deepEqual(material.pbrMetallicRoughness.baseColorFactor, [1, .8, .6, 1]);
      assert.equal(chibi.adapterId, "projectmx-weapon-test1-damage");
      assert.equal(chibi.renderPass, "forward");
      assert.equal(chibi.textureProperty, "_mainTex");
      assert.equal(chibi.unlit, false);
      assert.deepEqual(chibi.projectMxShaderExtraction, slot.projectMxShaderExtraction);
      assert.deepEqual(chibi.projectMxMaterialProperties, slot.materialProperties);
      assert.deepEqual(chibi.projectMxTextures, { mainTex: { index: 0 }, sourceTex: { index: 1 } });
      assert.equal(material.pbrMetallicRoughness.baseColorTexture.index, chibi.projectMxTextures.mainTex.index);
      assert.deepEqual(chibi.blend, { source: 1, destination: 0, sourceAlpha: 1, destinationAlpha: 0, operation: 0, operationAlpha: 0 });
      assert.deepEqual(document.meshes[0].primitives[0].attributes, {
        POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, TANGENT: 3, COLOR_0: 4,
      });
      assert.deepEqual(chibi.projectMxShaderExtraction.activeKeywordNames, variant === "glow" ? ["_GLOW_0"] : []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("fails closed for tampered ProjectMX pass declarations and missing exact source textures", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
  const cases = [
    { label: "pass-hash", profile: projectMxProfile({ tamperedPass: true }), expected: /forward pass has incomplete or tampered source pass metadata/ },
    { label: "pass-attributes", profile: projectMxProfile({ wrongAttribute: true }), expected: /outline pass has incomplete or tampered source pass metadata/ },
    { label: "source-texture", profile: projectMxProfile({ missingSource: true }), expected: /has no exact _mainTex identity/ },
    { label: "unverified-adapter", profile: (() => { const profile = projectMxProfile(); profile.renderers[0].materialSlots[0].sourceShaderReference.objectId = "999"; return profile; })(), expected: /unverified source identity or program version/ },
    { label: "unverified-colorless-mesh", profile: projectMxProfile(), fixture: { omitColor: true }, expected: /does not preserve COLOR_0 source data/ },
  ];
  for (const { label, profile, fixture, expected } of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-projectmx-${label}-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const mainTexture = path.join(root, "main.png"), sourceTexture = path.join(root, "source.png");
      await writeFile(input, glbWithProjectMxRenderer({ includeUnrelatedUnlit: label === "unverified-adapter", ...(fixture ?? {}) }));
      await writeFile(mainTexture, png);
      await writeFile(sourceTexture, png);
      const slot = profile.renderers[0].materialSlots[0];
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [
          { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_mainTex", textureReference: { bundleSha256: "c".repeat(64), serializedFile: "CAB-projectmx-textures", objectId: "29" }, path: mainTexture },
          { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_sourceTex", textureReference: { bundleSha256: "c".repeat(64), serializedFile: "CAB-projectmx-textures", objectId: "31" }, path: sourceTexture },
        ],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, expected);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

const transparentSourceReference = {
  bundleSha256: "27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85",
  serializedFile: "CAB-38d7f184c16228480d78cd7ea10cae27",
  objectId: "-5281742850669710733",
};
const transparentProgramBlobSha256 = "ff279d3985ac14ecb356f9ab863bb83b3b9d18033bfe897c877f8da866e6d345";
const transparentFingerprint = "476551579a557a660da5fa3454da6f10193c729fef20430d4c905e8df0c7d7a5";
const transparentForwardProgramHash = "a183c161a42534139176e57679b700599f385de97243d75ef719a70c0feea253";
const transparentDitherProgramHash = "8b65ba41e0b6f12e63d7d04c8eb017ac03a7962880f76474faea12cdcde319f9";
const transparentDepthProgramHash = "4ea792966bb7d8359234279f7e000ebea5c5a4fedd7a62ed819225f5186bae98";
const transparentForwardProgramRecordSha256 = "e9758ef79668f2925973ee08ab66cc059609e4c2e8440fddd1c27547c9df66fe";
const transparentDitherProgramRecordSha256 = "f834a20f9f5d48e3b99e9c7fd896fed2162374e81d6d50112174d924401049cf";
const transparentDepthProgramRecordSha256 = "33d45d0b45e7e4a2fd5f5fd4fe1d6b652e6d0d19de0d2a36665d344de31b7581";
const transparentForwardParameterRecordSha256 = "b6901e2d32877e7c7d19a77a513f345130a90e9e3c47ff7b22a39bab3af68f65";
const transparentDitherParameterRecordSha256 = "23375befaf4b4f6524e364569fe388024d9df20509258ad4b64b84491eee9a5c";
const transparentDepthParameterRecordSha256 = "d80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532";
const transparentForwardAttributes = ["POSITION", "NORMAL", "COLOR_0", "TEXCOORD_0"];
const transparentDepthAttributes = ["POSITION"];
const transparentForwardUniforms = ["_WorldSpaceCameraPos", "_MxCharShadowTone", "_MxCharLightData", "_Tint", "_ShadowThreshold", "_ShadowTint", "_Cutoff", "_RimAreaMultiplier", "_RimStrength", "_AdditionalLightStrength", "_AdditionalLightSharpness", "_GrayBrightness", "_MainTex_ST", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_DitherThreshold", "_MaskRtoG", "_MaskGSensitivity", "_SeeThroughMinValue", "_SeeThroughTransparency", "_SeeThroughSmoothness", "_GlobalMipBias", "_MxCharLightDir", "_MxCharLightTone", "_MainTex", "_MaskTex", "hlslcc_mtx4x4unity_MatrixVP"];
const transparentDitherUniforms = [...transparentForwardUniforms, "_ProjectionParams"];
const transparentDepthUniforms = ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld"];

function transparentGlsl(attributes, uniforms, normalDeclaration = "in mediump vec3 in_NORMAL0;") {
  const attributeDeclarations = attributes.map((attribute) => {
    if (attribute === "POSITION") return "in highp vec4 in_POSITION0;";
    if (attribute === "NORMAL") return normalDeclaration;
    if (attribute === "COLOR_0") return "in mediump vec4 in_COLOR0;";
    if (attribute === "TEXCOORD_0") return "in highp vec2 in_TEXCOORD0;";
    return `in highp vec4 in_${attribute};`;
  });
  const uniformDeclarations = uniforms.map((uniform) => `uniform float ${uniform};`);
  return ["#version 300 es", "#ifdef VERTEX", ...attributeDeclarations, ...uniformDeclarations,
    "#endif", "#ifdef FRAGMENT", ...uniformDeclarations, "#endif"].join("\n");
}

function transparentPass({ pass, stateName, passIndex, blobIndex, parameterBlobIndex, parameterRecordSha256,
  keywordIndices, keywordNames, programHash, programRecordSha256, attributes, uniforms, glsl, depthOnly = false,
  sourceBlend = 5, destinationBlend = 10, sourceBlendAlpha = 1, destinationBlendAlpha = 10, colorMask = 15 }) {
  return {
    pass, stateName, subShaderIndex: 0, passIndex, stage: "vertex", platform: 9, gpuProgramType: 4,
    blobIndex, parameterBlobIndex, parameterRecordSha256, keywordIndices, keywordNames, programHash,
    programDataSha256: programHash, programRecordSha256, glsl, requiredAttributes: attributes,
    requiredUniforms: uniforms,
    renderState: {
      zWrite: 0, zWriteProperty: "_ZWrite", zTest: 4, culling: 0, cullingProperty: "_Cull",
      sourceBlend, destinationBlend, sourceBlendAlpha, destinationBlendAlpha,
      blendOperation: 0, blendOperationAlpha: 0, colorMask, depthOnly,
    },
  };
}

function transparentProfile({ normalDeclaration = "in mediump vec3 in_NORMAL0;" } = {}) {
  const profile = renderingProfile({ mouth: false });
  const slot = profile.renderers[0].materialSlots[0];
  const mainReference = { bundleSha256: "e".repeat(64), serializedFile: "CAB-transparent-textures", objectId: "300" };
  const maskReference = { bundleSha256: "e".repeat(64), serializedFile: "CAB-transparent-textures", objectId: "301" };
  const forwardGlsl = transparentGlsl(transparentForwardAttributes, transparentForwardUniforms, normalDeclaration);
  const ditherGlsl = transparentGlsl(transparentForwardAttributes, transparentDitherUniforms, normalDeclaration);
  slot.sourceMaterialName = "Fixture_EyeMouth";
  slot.sourceShaderName = "MX/C-Transparent-ST";
  slot.sourceShaderParsedName = "MX/C-Transparent-ST";
  slot.sourceShaderReference = structuredClone(transparentSourceReference);
  slot.shaderProgramBlobSha256 = transparentProgramBlobSha256;
  slot.adapterId = "mx-c-transparent-st";
  slot.materialProperties = {
    floats: {
      _Cull: 0, _ZWrite: 1, _MaskGSensitivity: 1, _MaskRtoG: 0, _SeeThroughMinValue: 0.5,
      _SeeThroughTransparency: 1, _SeeThroughSmoothness: 1, _ShadowThreshold: 0.5, _RimAreaMultiplier: 1,
      _RimStrength: 1, _AdditionalLightStrength: 1, _AdditionalLightSharpness: 5, _DitherThreshold: 0,
      _GrayBrightness: 1, _Cutoff: 0.5,
    },
    ints: {},
    colors: { _Tint: [1, 1, 1, 1], _ShadowTint: [0.5, 0.5, 0.5, 1], _CodeAddColor: [0, 0, 0, 0], _CodeMultiplyColor: [1, 1, 1, 1], _CodeAddRimColor: [0, 0, 0, 0] },
    keywords: [],
    textures: [
      { name: "_MainTex", texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      { name: "_MaskTex", texture: { file: maskReference.serializedFile, pathId: maskReference.objectId }, textureReference: maskReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    ],
    resolvedTextures: [
      { property: "_MainTex", name: "Main", width: 256, height: 256, sourceReference: mainReference },
      { property: "_MaskTex", name: "Mask", width: 256, height: 256, sourceReference: maskReference },
    ],
  };
  slot.adapterSettings = { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: [1, 1, 1, 1], transparentVariant: "forward" };
  slot.renderState = {
    sourceQueue: 3000, layer: "transparent", alphaMode: "BLEND", depthWrite: true, depthTest: true,
    depthFunction: "less-equal", cullMode: "off", doubleSided: true,
    blend: { source: 5, destination: 10, sourceAlpha: 1, destinationAlpha: 10, operation: 0, operationAlpha: 0 },
    polygonOffsetFactor: 0, polygonOffsetUnits: 0,
  };
  slot.transparentShaderExtraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: "2021.3.27f1", fingerprint: transparentFingerprint,
    compressedBlobSha256: transparentProgramBlobSha256, sourceReference: structuredClone(transparentSourceReference),
    passes: {
      forward: transparentPass({ pass: "forward", stateName: "ForwardLit", passIndex: 0, blobIndex: 6, parameterBlobIndex: 0,
        parameterRecordSha256: transparentForwardParameterRecordSha256, keywordIndices: [], keywordNames: [],
        programHash: transparentForwardProgramHash, programRecordSha256: transparentForwardProgramRecordSha256,
        attributes: transparentForwardAttributes, uniforms: transparentForwardUniforms, glsl: forwardGlsl }),
      dither: transparentPass({ pass: "dither", stateName: "ForwardLit", passIndex: 0, blobIndex: 8, parameterBlobIndex: 1,
        parameterRecordSha256: transparentDitherParameterRecordSha256, keywordIndices: [9], keywordNames: ["_DITHER_HORIZONTAL_LINES"],
        programHash: transparentDitherProgramHash, programRecordSha256: transparentDitherProgramRecordSha256,
        attributes: transparentForwardAttributes, uniforms: transparentDitherUniforms, glsl: ditherGlsl }),
      depth: transparentPass({ pass: "depth", stateName: "", passIndex: 1, blobIndex: 31, parameterBlobIndex: 30,
        parameterRecordSha256: transparentDepthParameterRecordSha256, keywordIndices: [], keywordNames: [],
        programHash: transparentDepthProgramHash, programRecordSha256: transparentDepthProgramRecordSha256,
        attributes: transparentDepthAttributes, uniforms: transparentDepthUniforms,
        glsl: transparentGlsl(transparentDepthAttributes, transparentDepthUniforms), depthOnly: true,
        sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, colorMask: 0 }),
    },
  };
  return { profile, mainReference, maskReference };
}

const staticDsfxRules = [
  {
    identity: "dsfx/fx_shader_additive_0", programBlobSha256: "90b5288cb90cc49fbe68b9b8dac5f821c125c6954b9a4e64e4d66564f7668808",
    sourceReference: { bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c", serializedFile: "CAB-428091522b4007f213bf16532c4528a1", objectId: "-4115771715742154417" }, source: 1, destination: 1,
    properties: ["_Color", "_Texture", "_Custom_Data_Offset_Use", "_ZWrite_Mode", "_Cull_Mode", "_ZOffsetFactor", "_ZOffsetUnits", "_ZTest_Mode"],
  },
  {
    identity: "dsfx/fx_shader_alphablend_add", programBlobSha256: "44e96adec490724b76b094666ab9533d0814f804b2698b336672025b5f9607af",
    sourceReference: { bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c", serializedFile: "CAB-428091522b4007f213bf16532c4528a1", objectId: "3898777625326355543" }, source: 1, destination: 10,
    properties: ["_Color", "_Multiply", "_Texture", "_RGBRGBA", "_Main_Texture_No", "_Custom_Data_Offset_Use", "_ZWrite_Mode", "_Cull_Mode", "_ZTest_Mode", "_ZOffsetFactor", "_ZOffsetUnits"],
  },
  {
    identity: "dsfx/fx_shader_alphablend_0", programBlobSha256: "65b652e79bbcce530203321da335999c19212fc25807233878f6853813931576",
    sourceReference: { bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c", serializedFile: "CAB-428091522b4007f213bf16532c4528a1", objectId: "-660637482714961986" }, source: 5, destination: 10,
    properties: ["_Color", "_Multiply", "_Texture", "_RGBRGBA", "_Main_Texture_No", "_Custom_Data_Offset_Use", "_ZWrite_Mode", "_Cull_Mode", "_ZTest_Mode", "_ZOffsetFactor", "_ZOffsetUnits"],
  },
];

const dsfxAlphaBlend0Programs = [
  { blobIndex: 2, programHash: "2c09665c51d86387e06473c1585d28c889a95e1c5fa71cecf0cde66c20b722c6", programDataLength: 5036, recordSha256: "ab0e0ec212bfe8ae6c45530df60a04c95c2c7866df036eb573f18ccc871ed017" },
  { blobIndex: 3, programHash: "ed9223bce42bd6c85d0c76e5ac38d1084b9b90e91c15c6c27689423b738363cd", programDataLength: 4478, recordSha256: "f16a1b6cfc5d32592bb1d825e727a1e4cec28da95f952ae8dedd65b208f73b30" },
  { blobIndex: 6, programHash: "1c9c2c9ac313c8108d0c27abc7647ded21bb5a993747d1551d11a9d543f24643", programDataLength: 4681, recordSha256: "50e396be9c4bb52a51fc2ea71fc32d8cbf51dced0c470ddfc8c97f7bb23b664d" },
  { blobIndex: 7, programHash: "ec5da5e2e0c2ecbeabeed1cdd694cfedbf195d0b0a97627ce907f57ea568dbbd", programDataLength: 4262, recordSha256: "5380845aecc60afa3ee27ef5832833af4d1a10fa429ac6f9c781529762474c64" },
];

const dsfxAlphaBlendAddKeywords = ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "DEBUG_DISPLAY", "INSTANCING_ON", "_CASTING_PUNCTUAL_LIGHT_SHADOW"];
const dsfxAlphaBlendAddPrograms = [
  {
    blobIndex: 2, offset: 2568, size: 5096, segment: 0, sourceMap: 57, version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "df04b3b74a13eb8720e8c9e3dbb4adf56c4cad61c60c691a2c59cf7aa59c1659", programDataLength: 5055, recordSha256: "56fa177b4bc146116debfca1afab21a995b302f8e92ea27074ff53dabb7684d0",
    parameterBlobIndex: 0, parameterRecordSha256: "a4e32c89ae00a77e44f772e5f50b371d34028243345b2231c8817beb0bce74d3", passIndex: 0, passName: "", stateName: "Forward", playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, shaderRequirements: 227, keywordIndices: [], keywordNames: [],
    attributes: ["in_POSITION0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD3", "vs_COLOR0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "unity_LODFade", "unity_WorldTransformParams", "unity_RenderingLayer", "unity_LightData", "unity_LightIndices", "unity_ProbesOcclusion", "unity_SpecCube0_HDR", "unity_SpecCube1_HDR", "unity_SpecCube0_BoxMax", "unity_SpecCube0_BoxMin", "unity_SpecCube0_ProbePosition", "unity_SpecCube1_BoxMax", "unity_SpecCube1_BoxMin", "unity_SpecCube1_ProbePosition", "unity_LightmapST", "unity_DynamicLightmapST", "unity_SHAr", "unity_SHAg", "unity_SHAb", "unity_SHBr", "unity_SHBg", "unity_SHBb", "unity_SHC", "hlslcc_mtx4x4unity_MatrixPreviousM", "hlslcc_mtx4x4unity_MatrixPreviousMI", "unity_MotionVectorsParams", "_Color", "_Texture_ST", "_ZTest_Mode", "_Cull_Mode", "_ZWrite_Mode", "_ZOffsetUnits", "_ZOffsetFactor", "_Multiply", "_RGBRGBA", "_Custom_Data_Offset_Use", "_Main_Texture_No", "_Texture"],
  },
  {
    blobIndex: 3, offset: 7664, size: 4560, segment: 0, sourceMap: 57, version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "4c734b1eddd609e21119a81d0e3cf0fb4e3c8b3ae981e741c02eeaae72ec5bd3", programDataLength: 4497, recordSha256: "c6f83c938ddfd905863e50f341ba8c445568254664402ae174ac2c235af17098",
    parameterBlobIndex: 1, parameterRecordSha256: "5db8a8a64c9a4eb5ca694006a5f4cb90d57b6421d602cb025745d389fe67c865", passIndex: 0, passName: "", stateName: "Forward", playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, shaderRequirements: 2275, keywordIndices: [5], keywordNames: ["INSTANCING_ON"],
    attributes: ["in_POSITION0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD3", "vs_COLOR0", "vs_SV_InstanceID0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "unity_Builtins0Array", "_Color", "_Texture_ST", "_ZTest_Mode", "_Cull_Mode", "_ZWrite_Mode", "_ZOffsetUnits", "_ZOffsetFactor", "_Multiply", "_RGBRGBA", "_Custom_Data_Offset_Use", "_Main_Texture_No", "_Texture"],
  },
  {
    blobIndex: 6, offset: 14356, size: 4660, segment: 0, sourceMap: 59, version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "13e560d4e67cdd506232363684014b837d096c675123816d7d52d6570cfd775e", programDataLength: 4620, recordSha256: "1aa2a0449aa09764b09a525ed943b4b095d6ffdae1563cd2bcdfc9a037b5b713",
    parameterBlobIndex: 4, parameterRecordSha256: "697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17", passIndex: 1, passName: "", stateName: "ShadowCaster", playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, shaderRequirements: 227, keywordIndices: [], keywordNames: [],
    attributes: ["in_POSITION0", "in_NORMAL0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD2", "vs_COLOR0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "unity_LODFade", "unity_WorldTransformParams", "unity_RenderingLayer", "unity_LightData", "unity_LightIndices", "unity_ProbesOcclusion", "unity_SpecCube0_HDR", "unity_SpecCube1_HDR", "unity_SpecCube0_BoxMax", "unity_SpecCube0_BoxMin", "unity_SpecCube0_ProbePosition", "unity_SpecCube1_BoxMax", "unity_SpecCube1_BoxMin", "unity_SpecCube1_ProbePosition", "unity_LightmapST", "unity_DynamicLightmapST", "unity_SHAr", "unity_SHAg", "unity_SHAb", "unity_SHBr", "unity_SHBg", "unity_SHBb", "unity_SHC", "hlslcc_mtx4x4unity_MatrixPreviousM", "hlslcc_mtx4x4unity_MatrixPreviousMI", "unity_MotionVectorsParams"],
  },
  {
    blobIndex: 7, offset: 19016, size: 4264, segment: 0, sourceMap: 59, version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "a1368f654663b3060b14b33fc3228e12159327792845877575f693c1c50a6c53", programDataLength: 4201, recordSha256: "b3b2b3aecc12c5fb8c248c1dd530c4e6521d43b798f1cab41ff2f81060b4d53f",
    parameterBlobIndex: 5, parameterRecordSha256: "48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51", passIndex: 1, passName: "", stateName: "ShadowCaster", playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, shaderRequirements: 2275, keywordIndices: [5], keywordNames: ["INSTANCING_ON"],
    attributes: ["in_POSITION0", "in_NORMAL0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD2", "vs_COLOR0", "vs_SV_InstanceID0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "unity_Builtins0Array"],
  },
];

const dsfxAdditive0Keywords = ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "DEBUG_DISPLAY", "INSTANCING_ON", "_CASTING_PUNCTUAL_LIGHT_SHADOW"];
const dsfxAdditive0Programs = [
  {
    blobIndex: 2, offset: 2568, size: 4660, segment: 0, sourceMap: 57, version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "3385102c84a54b6579e34b8c667635094f353a9802770da2f58e91fbbbc60026", programDataLength: 4618, recordSha256: "c3c0a70448fed498fee19ae556974d594a37edf16e1ac47ea2f364dc5b4a8b1d",
    parameterBlobIndex: 0, parameterRecordSha256: "619c2de6aa2781b2363fe443f77609736903c60335e25c5eaa3d2d705c9e0173", passIndex: 0, passName: "", stateName: "Forward", playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, shaderRequirements: 227, keywordIndices: [], keywordNames: [],
    attributes: ["in_POSITION0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD3", "vs_TEXCOORD4", "vs_COLOR0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "unity_LODFade", "unity_WorldTransformParams", "unity_RenderingLayer", "unity_LightData", "unity_LightIndices", "unity_ProbesOcclusion", "unity_SpecCube0_HDR", "unity_SpecCube1_HDR", "unity_SpecCube0_BoxMax", "unity_SpecCube0_BoxMin", "unity_SpecCube0_ProbePosition", "unity_SpecCube1_BoxMax", "unity_SpecCube1_BoxMin", "unity_SpecCube1_ProbePosition", "unity_LightmapST", "unity_DynamicLightmapST", "unity_SHAr", "unity_SHAg", "unity_SHAb", "unity_SHBr", "unity_SHBg", "unity_SHBb", "unity_SHC", "hlslcc_mtx4x4unity_MatrixPreviousM", "hlslcc_mtx4x4unity_MatrixPreviousMI", "unity_MotionVectorsParams", "_Texture_ST", "_Color", "_ZOffsetFactor", "_ZOffsetUnits", "_ZWrite_Mode", "_Cull_Mode", "_ZTest_Mode", "_Custom_Data_Offset_Use"],
  },
  {
    blobIndex: 3, offset: 7228, size: 4120, segment: 0, sourceMap: 57, version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "fa6ec097af34d57cab64d105f411ac41bde7991de417ba1c02413a4ed88baabd", programDataLength: 4060, recordSha256: "b8877e78e3acacc5e0891dbfb2d43f8db989f6b1614454417e4dd5c9b972e77f",
    parameterBlobIndex: 1, parameterRecordSha256: "1fe7d3f57ddd22705f4b97fd0c5c86e2c43af931a39f3718047ae65bc4b7fcda", passIndex: 0, passName: "", stateName: "Forward", playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, shaderRequirements: 2275, keywordIndices: [5], keywordNames: ["INSTANCING_ON"],
    attributes: ["in_POSITION0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD3", "vs_TEXCOORD4", "vs_COLOR0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "unity_Builtins0Array", "_Texture_ST", "_Color", "_ZOffsetFactor", "_ZOffsetUnits", "_ZWrite_Mode", "_Cull_Mode", "_ZTest_Mode", "_Custom_Data_Offset_Use"],
  },
  {
    blobIndex: 6, offset: 13480, size: 4420, segment: 0, sourceMap: 3, version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5", programDataLength: 4379, recordSha256: "9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4",
    parameterBlobIndex: 4, parameterRecordSha256: "697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17", passIndex: 1, passName: "", stateName: "ShadowCaster", playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, shaderRequirements: 227, keywordIndices: [], keywordNames: [],
    attributes: ["in_POSITION0", "in_NORMAL0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "unity_LODFade", "unity_WorldTransformParams", "unity_RenderingLayer", "unity_LightData", "unity_LightIndices", "unity_ProbesOcclusion", "unity_SpecCube0_HDR", "unity_SpecCube1_HDR", "unity_SpecCube0_BoxMax", "unity_SpecCube0_BoxMin", "unity_SpecCube0_ProbePosition", "unity_SpecCube1_BoxMax", "unity_SpecCube1_BoxMin", "unity_SpecCube1_ProbePosition", "unity_LightmapST", "unity_DynamicLightmapST", "unity_SHAr", "unity_SHAg", "unity_SHAb", "unity_SHBr", "unity_SHBg", "unity_SHBb", "unity_SHC", "hlslcc_mtx4x4unity_MatrixPreviousM", "hlslcc_mtx4x4unity_MatrixPreviousMI", "unity_MotionVectorsParams"],
  },
  {
    blobIndex: 7, offset: 17900, size: 4020, segment: 0, sourceMap: 3, version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "c398892908c135f4a88395ef710f0c25d6ba2b6da763f8850935134ac325ddc1", programDataLength: 3960, recordSha256: "1e7b1e587aa7e0369a0415df992f515cbde6fd63b4db544a0a3e8ea76de8abc0",
    parameterBlobIndex: 5, parameterRecordSha256: "48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51", passIndex: 1, passName: "", stateName: "ShadowCaster", playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, shaderRequirements: 2275, keywordIndices: [5], keywordNames: ["INSTANCING_ON"],
    attributes: ["in_POSITION0", "in_NORMAL0"], uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "unity_Builtins0Array"],
  },
];

function dsfxAlphaBlend0Extraction(rule) {
  const forwardGlsl = [
    "#version 300 es", "uniform vec4 _Color;", "uniform vec4 _Custom_Data_Offset_Use;",
    "uniform vec4 _Texture_ST;", "uniform sampler2D _Texture;",
  ].join("\n");
  const shadowGlsl = [
    "#version 300 es", "uniform vec4 _ShadowBias;", "uniform vec3 _LightDirection;",
    "uniform vec4 _ShadowCoordModifier;", "uniform mat4 hlslcc_mtx4x4unity_MatrixVP;",
  ].join("\n");
  const programs = dsfxAlphaBlend0Programs.map((program, index) => ({
    kind: "program", blobIndex: program.blobIndex, platform: 9, gpuProgramType: 4,
    programHash: program.programHash, programDataSha256: program.programHash,
    programDataLength: program.programDataLength, recordSha256: program.recordSha256,
    glsl: index < 2 ? forwardGlsl : shadowGlsl,
  }));
  return {
    schemaVersion: 1, extractorVersion: 1, unityVersion: "2021.3", fingerprint: "8".repeat(64),
    compressedBlobSha256: rule.programBlobSha256,
    shader: { name: "DSFX/FX_SHADER_AlphaBlend_0", sourceReference: structuredClone(rule.sourceReference), keywordNames: [] },
    programs, gles3Programs: programs,
    bindings: programs.map((program, index) => ({
      subShaderIndex: 0, passIndex: index < 2 ? 0 : 1,
      passName: index < 2 ? "Forward" : "ShadowCaster", stateName: index < 2 ? "Forward" : "ShadowCaster",
      stage: "vertex", blobIndex: program.blobIndex, parameterBlobIndex: index,
      platform: 9, gpuProgramType: 4, keywordIndices: [], keywordNames: [],
      programHash: program.programHash, gles3ProgramHash: program.programHash,
      programRecordSha256: program.recordSha256,
    })),
  };
}

function dsfxAlphaBlendAddExtraction(rule) {
  const programs = dsfxAlphaBlendAddPrograms.map((spec) => {
    const source = [
      "#ifdef VERTEX", "#version 300 es",
      ...spec.attributes.map((name) => `${name.startsWith("vs_") ? "out" : "in"} highp vec4 ${name};`),
      ...spec.uniforms.map((name) => `${name === "_Texture" ? "uniform sampler2D" : "uniform vec4"} ${name};`),
      "#endif", "#ifdef FRAGMENT", "#version 300 es", "void main() {}", "#endif",
    ].join("\n");
    const glsl = `${source}${" ".repeat(Math.max(0, spec.programDataLength - source.length))}`;
    return {
      kind: "program", ...spec, programDataSha256: spec.programHash, keywords: [...spec.keywordNames], glsl,
      sourceReference: structuredClone(rule.sourceReference),
    };
  });
  return {
    schemaVersion: 1, extractorVersion: 1, unityVersion: "2021.3", fingerprint: "bdf731975748307a798ac9b06c9d2bbb0078ac1a80d02c5d790de6e85c8aceb8",
    compressedBlobSha256: rule.programBlobSha256,
    shader: { name: "DSFX/FX_SHADER_AlphaBlend_Add", sourceReference: structuredClone(rule.sourceReference), keywordNames: [...dsfxAlphaBlendAddKeywords] },
    programs, gles3Programs: programs,
    bindings: dsfxAlphaBlendAddPrograms.map((spec) => ({
      subShaderIndex: 0, passIndex: spec.passIndex, passName: spec.passName, stateName: spec.stateName, stage: "vertex",
      playerGroupIndex: spec.playerGroupIndex, playerIndex: spec.playerIndex, subProgramIndex: spec.subProgramIndex,
      blobIndex: spec.blobIndex, parameterBlobIndex: spec.parameterBlobIndex, gpuProgramType: spec.gpuProgramType,
      gpuProgramTypeName: spec.gpuProgramTypeName, keywordIndices: [...spec.keywordIndices], keywordNames: [...spec.keywordNames],
      shaderRequirements: spec.shaderRequirements, platform: spec.platform, programHash: spec.programHash,
      programRecordSha256: spec.recordSha256, parameterRecordSha256: spec.parameterRecordSha256,
      gles3ProgramHash: spec.programHash, sourceReference: structuredClone(rule.sourceReference),
    })),
  };
}

function dsfxAdditive0Extraction(rule) {
  const programs = dsfxAdditive0Programs.map((spec) => {
    const source = [
      "#ifdef VERTEX", "#version 300 es", ...spec.attributes.map((name) => `in highp vec4 ${name};`),
      ...spec.uniforms.map((name) => `uniform vec4 ${name};`), "uniform sampler2D _Texture;", "#endif", "#ifdef FRAGMENT", "void main() {}", "#endif",
    ].join("\n");
    const glsl = `${source}${" ".repeat(Math.max(0, spec.programDataLength - source.length))}`;
    return {
      kind: "program", ...spec, programDataSha256: spec.programHash, keywords: [...spec.keywordNames], glsl,
      sourceReference: structuredClone(rule.sourceReference),
    };
  });
  return {
    schemaVersion: 1, extractorVersion: 1, unityVersion: "2021.3", fingerprint: "e4f30af59274e0b917915212c19c6c7e8c47f2da605d04a0eb6649c5d0ff1cfc",
    compressedBlobSha256: rule.programBlobSha256,
    shader: { name: "DSFX/FX_SHADER_Additive_0", sourceReference: structuredClone(rule.sourceReference), keywordNames: [...dsfxAdditive0Keywords] },
    programs, gles3Programs: programs,
    bindings: dsfxAdditive0Programs.map((spec) => ({
      subShaderIndex: 0, passIndex: spec.passIndex, passName: spec.passName, stateName: spec.stateName, stage: "vertex",
      playerGroupIndex: spec.playerGroupIndex, playerIndex: spec.playerIndex, subProgramIndex: spec.subProgramIndex,
      blobIndex: spec.blobIndex, parameterBlobIndex: spec.parameterBlobIndex, gpuProgramType: spec.gpuProgramType,
      gpuProgramTypeName: spec.gpuProgramTypeName, keywordIndices: [...spec.keywordIndices], keywordNames: [...spec.keywordNames],
      shaderRequirements: spec.shaderRequirements, platform: spec.platform, programHash: spec.programHash,
      programRecordSha256: spec.recordSha256, parameterRecordSha256: spec.parameterRecordSha256,
      gles3ProgramHash: spec.programHash, sourceReference: structuredClone(rule.sourceReference),
    })),
  };
}

function staticDsfxProfile(ruleIndex = 1, { dynamic = false, inertProperty = null, renderStateVariant = null } = {}) {
  const rule = staticDsfxRules[ruleIndex];
  const profile = renderingProfile({ mouth: false });
  const slot = profile.renderers[0].materialSlots[0];
  const textureReference = { bundleSha256: "d".repeat(64), serializedFile: "CAB-dsfx-textures", objectId: "9007199254741001" };
  slot.sourceShaderReference = rule.sourceReference;
  slot.sourceShaderName = rule.identity;
  slot.sourceShaderParsedName = rule.identity;
  slot.shaderProgramBlobSha256 = rule.programBlobSha256;
  slot.adapterId = "dsfx-static";
  slot.materialProperties = {
    floats: {
      _Custom_Data_Offset_Use: 0, _ZWrite_Mode: 0, _Cull_Mode: 2, _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ZTest_Mode: 4,
      ...(ruleIndex > 0 ? { _Multiply: 1, _RGBRGBA: 0, _Main_Texture_No: 1 } : {}),
      ...(dynamic ? { _DistortionEnabled: 1, _DistortionStrength: 1 } : {}),
      ...(inertProperty ? { [inertProperty]: 1 } : {}),
    },
    ints: {}, colors: { _Color: { r: 0.25, g: 0.5, b: 0.75, a: 0.8 } }, keywords: [],
    textures: [{ name: "_Texture", texture: { file: textureReference.serializedFile, pathId: textureReference.objectId }, textureReference,
      scale: { x: 0.75, y: 0.5 }, offset: { x: 0.1, y: 0.25 } }],
    resolvedTextures: [{ property: "_Texture", name: "DSFX_Texture", width: 256, height: 256, sourceReference: textureReference }],
  };
  if (ruleIndex === 0) slot.dsfxShaderExtraction = dsfxAdditive0Extraction(rule);
  if (ruleIndex === 1) slot.dsfxShaderExtraction = dsfxAlphaBlendAddExtraction(rule);
  if (ruleIndex === 2) slot.dsfxShaderExtraction = dsfxAlphaBlend0Extraction(rule);
  if (ruleIndex === 1 || ruleIndex === 2) slot.dsfxRenderStateVariant = renderStateVariant ?? "static-default";
  slot.adapterSettings = { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: [0.25, 0.5, 0.75, 0.8], dsfxMultiply: ruleIndex > 0 ? 1 : null };
  const variantState = ruleIndex === 1 || ruleIndex === 2 ? {
    "static-default": { depthWrite: false, depthTest: false, depthFunction: "disabled", cullMode: "off", doubleSided: true },
    "depth-tested-back-cull": { depthWrite: false, depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false },
    "depth-tested-off-double-sided": { depthWrite: false, depthTest: true, depthFunction: "less-equal", cullMode: "off", doubleSided: true },
  }[slot.dsfxRenderStateVariant] : { depthWrite: false, depthTest: false, depthFunction: "disabled", cullMode: "off", doubleSided: true };
  slot.renderState = {
    sourceQueue: 3000, layer: "transparent", alphaMode: "BLEND", ...variantState,
    blend: { source: rule.source, destination: rule.destination, sourceAlpha: rule.source, destinationAlpha: rule.destination, operation: 0, operationAlpha: 0 },
    polygonOffsetFactor: 0, polygonOffsetUnits: 0,
  };
  return { profile, textureReference };
}

function wakamoEyeDsfxProfile() {
  const { profile } = staticDsfxProfile(1, { renderStateVariant: "depth-tested-back-cull" });
  const slot = profile.renderers[0].materialSlots[0];
  slot.sourceMaterialReference = {
    bundleSha256: "46acf4c44d1cfbbdbdcc20d8227397323273739b1021442ddd77c6c4e4af3816",
    serializedFile: "CAB-0ff8a11237bb688b3a3deddb961cd2a6", objectId: "1142847250617954324",
  };
  slot.dsfxMaterialVariant = "wakamo-eye-white-default";
  slot.renderState.sourceQueue = -1;
  slot.materialProperties.floats = {
    _AlphaClip: 0, _Blend: 0, _BumpScale: 1, _Cull: 2, _Cull_Mode: 2, _Custom_Data_Offset_Use: 1,
    _Cutoff: 0.5, _DetailNormalMapScale: 1, _DstBlend: 0, _GlossMapScale: 1, _Glossiness: 0,
    _GlossyReflections: 1, _Main_Texture_No: 1, _Metallic: 0, _Multiply: 1, _OcclusionStrength: 1,
    _Parallax: 0.019999999552965164, _RGBRGBA: 0, _SmoothnessTextureChannel: 0, _SpecularHighlights: 1,
    _SrcBlend: 1, _Surface: 0, _UVSec: 0, _WorkflowMode: 1, _ZOffsetFactor: 0, _ZOffsetUnits: 0,
    _ZTest_Mode: 4, _ZWrite: 1, _ZWrite_Mode: 0,
  };
  slot.materialProperties.colors = {
    _Color: { r: 6.264151096343994, g: 1.3296549320220947, b: 1.3296549320220947, a: 1 },
    _EmissionColor: { r: 0, g: 0, b: 0, a: 0 },
    _SpecColor: { r: 0.19999995827674866, g: 0.19999995827674866, b: 0.19999995827674866, a: 1 },
  };
  slot.materialProperties.textures = [{
    name: "_Texture", texture: { file: "CAB-0ff8a11237bb688b3a3deddb961cd2a6", pathId: "0" }, textureReference: null,
    scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
  }];
  slot.materialProperties.resolvedTextures = [];
  slot.adapterSettings.baseColorTint = [6.264151096343994, 1.3296549320220947, 1.3296549320220947, 1];
  slot.adapterSettings.dsfxMultiply = 1;
  return profile;
}

const glitchTexSourceReference = {
  bundleSha256: "27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85",
  serializedFile: "CAB-38d7f184c16228480d78cd7ea10cae27", objectId: "-50954330373109545",
};
const glitchTexNoiseReference = {
  bundleSha256: "1454c8ba7cc0b23065122af1ab8892f9490299c10032118abeaa13cad5488b74",
  serializedFile: "CAB-39fe55e8868aab69e2cf9a8ae5dcef67", objectId: "277634516359511144",
};
const glitchTexProgramBlobSha256 = "b8f29baf75b913a1231adf3c24f8a24b179deaee5bbc03a0e145984c691a15a0";
const glitchTexFingerprint = "da4f6c1689e70742a01d91febca067eb0492a4121ad2fc63476323a6459f7b3e";
const glitchTexKeywords = ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "DEBUG_DISPLAY", "INSTANCING_ON", "_CASTING_PUNCTUAL_LIGHT_SHADOW"];
const glitchTexProperties = ["_MainTex", "_x", "_y", "_Speed_Value", "_NoiseTex", "_Shaking", "_Glitch_value", "_Jitter", "_Cull_Mode"];
const glitchTexTextureProperties = ["_MainTex", "_NoiseTex"];
const glitchTexPassSpecs = {
  forward: {
    pass: "forward", stateName: "Forward", passIndex: 0, blobIndex: 1, parameterBlobIndex: 0,
    parameterRecordSha256: "42c347357ddcd6b9365ba7a523bf05e2b4aa17076093ba172e7ac7ad313f1450",
    programHash: "38d23aef9f77ca1a78dfd0efb262bca0bccdafaa1b72b2da397d03bb8c8baf71",
    programRecordSha256: "3bc739b0ac1bdfebdef0f55320721c38555e9e0e263a844a90287b32c3656dbc", programDataLength: 5868,
    requiredAttributes: ["POSITION", "TEXCOORD_0"],
    requiredUniforms: ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "_Time", "_Cull_Mode", "_Speed_Value", "_Shaking", "_Jitter", "_Glitch_value", "_x", "_y", "_NoiseTex", "_MainTex"],
    renderState: { zWrite: 0, zTest: 4, culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
  },
  shadow: {
    pass: "shadow", stateName: "ShadowCaster", passIndex: 1, blobIndex: 3, parameterBlobIndex: 2,
    parameterRecordSha256: "89cb58753bbfac486d044fc253235f533f9634393bd30204de277063619427ee",
    programHash: "c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5",
    programRecordSha256: "9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4", programDataLength: 4379,
    requiredAttributes: ["POSITION", "NORMAL"],
    requiredUniforms: ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorld"],
    renderState: { zWrite: 1, zTest: 4, culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
  },
};

function glitchTexGlsl(attributes, uniforms) {
  const sourceAttribute = (attribute) => attribute === "POSITION" ? "in_POSITION0" : attribute === "NORMAL" ? "in_NORMAL0" : "in_TEXCOORD0";
  return ["#version 300 es", "#ifdef VERTEX", ...attributes.map((attribute) => `in mediump vec3 ${sourceAttribute(attribute)};`),
    ...uniforms.map((uniform) => `${uniform === "_NoiseTex" || uniform === "_MainTex" ? "uniform sampler2D" : "uniform mediump vec4"} ${uniform};`),
    "#endif", "#ifdef FRAGMENT", "void main() {}", "#endif"].join("\n");
}

function glitchTexPass(name, spec, tampered = false) {
  return {
    pass: spec.pass, stateName: spec.stateName, subShaderIndex: 0, passIndex: spec.passIndex, stage: "vertex", platform: 9, gpuProgramType: 4,
    blobIndex: spec.blobIndex, parameterBlobIndex: spec.parameterBlobIndex, parameterRecordSha256: spec.parameterRecordSha256,
    keywordIndices: [], keywordNames: [], programHash: tampered ? "0".repeat(64) : spec.programHash,
    programDataSha256: tampered ? "0".repeat(64) : spec.programHash, programRecordSha256: spec.programRecordSha256, programDataLength: spec.programDataLength,
    glsl: glitchTexGlsl(spec.requiredAttributes, spec.requiredUniforms), requiredAttributes: spec.requiredAttributes, requiredUniforms: spec.requiredUniforms,
    renderState: spec.renderState,
  };
}

function glitchTexProfile({ tamperedPass = false, tamperedKeywords = false, tamperedNoise = false } = {}) {
  const profile = renderingProfile({ mouth: false });
  const slot = profile.renderers[0].materialSlots[0];
  const materialReference = slot.sourceMaterialReference;
  slot.sourceMaterialName = "FX_MAT_Glitch_01";
  slot.sourceShaderReference = structuredClone(glitchTexSourceReference);
  slot.sourceShaderName = "DSFX/FX_SHADER_Glitch_Tex";
  slot.sourceShaderParsedName = "DSFX/FX_SHADER_Glitch_Tex";
  slot.shaderProgramBlobSha256 = glitchTexProgramBlobSha256;
  slot.adapterId = "dsfx-glitch-tex";
  slot.materialProperties = {
    floats: { _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12 },
    ints: {}, colors: {}, keywords: [],
    textures: [
      { name: "_MainTex", texture: { file: materialReference.serializedFile, pathId: "0" }, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      { name: "_NoiseTex", texture: { file: glitchTexNoiseReference.serializedFile, pathId: glitchTexNoiseReference.objectId }, textureReference: structuredClone(glitchTexNoiseReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    ],
    resolvedTextures: [{ property: "_NoiseTex", name: "FX_TEX_Noise_16", width: 256, height: 256, sourceReference: structuredClone(glitchTexNoiseReference) }],
  };
  if (tamperedKeywords) slot.materialProperties.keywords = ["INSTANCING_ON"];
  if (tamperedNoise) slot.materialProperties.textures[1].textureReference.objectId = "999";
  slot.adapterSettings = { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: null };
  slot.renderState = {
    sourceQueue: -1, layer: "transparent", alphaMode: "BLEND", depthWrite: false, depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false,
    blend: { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 }, polygonOffsetFactor: 0, polygonOffsetUnits: 0,
  };
  slot.glitchShaderExtraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: "2021.3", fingerprint: glitchTexFingerprint,
    sourceReference: structuredClone(glitchTexSourceReference), compressedBlobSha256: glitchTexProgramBlobSha256, shaderName: "DSFX/FX_SHADER_Glitch_Tex",
    shaderKeywordNames: glitchTexKeywords, requiredProperties: glitchTexProperties, requiredTextureProperties: glitchTexTextureProperties,
    passes: { forward: glitchTexPass("forward", glitchTexPassSpecs.forward, tamperedPass), shadow: glitchTexPass("shadow", glitchTexPassSpecs.shadow) },
  };
  return { profile, materialReference };
}

const matcapSourceReference = {
  bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c",
  serializedFile: "CAB-428091522b4007f213bf16532c4528a1", objectId: "-2917564576425350283",
};
const matcapMaterialReference = {
  bundleSha256: "d595ec49e21a44b8a9d1fb280f5e9ea00fedcda560ffc242e792b4fcd175d748",
  serializedFile: "CAB-ea179b2d4143f9bef81bc7cac07dcd93", objectId: "-5136731906767245831",
};
const matcapMainTextureReference = {
  bundleSha256: "c0902532467f62315531c05d9e7047e6265b5021ac982cf06cdd87ecb2ffd4b4",
  serializedFile: "CAB-22cae0b66f2ef2c9cc2627354aa6e59d", objectId: "-1931283808872943791",
};
const matcapTextureReference = {
  bundleSha256: "1e293d91261dd2af2b91657dfe0e2e0512c48e246ac43ac90d99159975f5b1a7",
  serializedFile: "CAB-7405438e0c71de1c2ead1707d796c2fc", objectId: "3221402221456861287",
};
const matcapProgramBlobSha256 = "3da48932a17f98d5de6fc428f1ba992e824152b12be7e30a169cae5de3c1ba9d";
const matcapFingerprint = "99e3d6e9cccc359cdf91cd2e7253b62b1929a522326d1291a7ae43d944e468dc";
const matcapShaderKeywords = ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "DEBUG_DISPLAY", "INSTANCING_ON", "_CASTING_PUNCTUAL_LIGHT_SHADOW"];
const matcapRequiredProperties = ["_Main_Color", "_Main_Tex", "_Matcap_Tex", "_ZWrite_Mode", "_Cull_Mode", "_texcoord"];
const matcapRequiredTextureProperties = ["_Main_Tex", "_Matcap_Tex"];
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
};
const matcapInertColors = {
  _BaseColor: { r: 1, g: 1, b: 1, a: 1 },
  _Color: { r: 1, g: 1, b: 1, a: 1 },
  _EmissionColor: { r: 0, g: 0, b: 0, a: 1 },
  _SpecColor: { r: 0.5849056243896484, g: 0.5849056243896484, b: 0.5849056243896484, a: 0.032999999821186066 },
};
const matcapForwardAttributes = ["POSITION", "NORMAL", "TEXCOORD_0", "COLOR_0"];
const matcapShadowAttributes = ["POSITION", "NORMAL", "COLOR_0"];
const matcapForwardStaticUniforms = ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "hlslcc_mtx4x4unity_MatrixV", "_Main_Color", "_Main_Tex_ST", "_ZWrite_Mode", "_Cull_Mode", "_Matcap_Tex", "_Main_Tex"];
const matcapForwardInstancedUniforms = ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "hlslcc_mtx4x4unity_ObjectToWorldArray", "hlslcc_mtx4x4unity_WorldToObjectArray", "unity_Builtins0Array", "hlslcc_mtx4x4unity_MatrixV", "_Main_Color", "_Main_Tex_ST", "_ZWrite_Mode", "_Cull_Mode", "_Matcap_Tex", "_Main_Tex"];
const matcapShadowStaticUniforms = ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject"];
const matcapShadowInstancedUniforms = ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorldArray", "hlslcc_mtx4x4unity_WorldToObjectArray", "unity_Builtins0Array"];
const matcapPassSpecs = {
  forward: {
    pass: "forward", variant: "static", stateName: "Forward", passIndex: 0, blobIndex: 2, parameterBlobIndex: 0,
    parameterRecordSha256: "1230f6ffd03db1548c00445789724828bc1a7f9337d3d045b19258d6e99f2150",
    programHash: "b98d2bba4e992fe400691c433717001cad063da52877a5d4c9344af5f044581e",
    programRecordSha256: "a6bfa89e41fbd5fd2c430cc5116ffcbe0b0a279fe3413c53a8288ee647be394e", programDataLength: 5178,
    requiredAttributes: matcapForwardAttributes, requiredUniforms: matcapForwardStaticUniforms, keywordIndices: [], keywordNames: [],
    renderState: { zWrite: 0, zWriteProperty: "_ZWrite_Mode", zTest: 4, zTestProperty: "<noninit>", culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
  },
  forwardInstanced: {
    pass: "forward", variant: "instanced", stateName: "Forward", passIndex: 0, blobIndex: 3, parameterBlobIndex: 1,
    parameterRecordSha256: "1f57f72e922d53d408292fef50d8c2a03f8709aa7bbb4d2a476d2bcb40768175",
    programHash: "38ad3365c7eab792e89d17ef3dd20f0ad6e9247acfec18d09ce4338f8b4b25e4",
    programRecordSha256: "fea97058aa6a206718c737ac7cc12386dca183d0a6536b345a12c75c3eaac49f", programDataLength: 4726,
    requiredAttributes: matcapForwardAttributes, requiredUniforms: matcapForwardInstancedUniforms, keywordIndices: [5], keywordNames: ["INSTANCING_ON"],
    renderState: { zWrite: 0, zWriteProperty: "_ZWrite_Mode", zTest: 4, zTestProperty: "<noninit>", culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
  },
  shadow: {
    pass: "shadow", variant: "static", stateName: "ShadowCaster", passIndex: 1, blobIndex: 6, parameterBlobIndex: 4,
    parameterRecordSha256: "697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17",
    programHash: "d33e4c0eafc7babbf55f46b18680bc921c80e888df1fe3d81e6620c9533a0b67",
    programRecordSha256: "34b37cd383e739b9b50ef5cdc0568c314480d50bd340ee778743357cc4bbfcb3", programDataLength: 4923,
    requiredAttributes: matcapShadowAttributes, requiredUniforms: matcapShadowStaticUniforms, keywordIndices: [], keywordNames: [],
    renderState: { zWrite: 1, zWriteProperty: "<noninit>", zTest: 4, zTestProperty: "<noninit>", culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
  },
  shadowInstanced: {
    pass: "shadow", variant: "instanced", stateName: "ShadowCaster", passIndex: 1, blobIndex: 7, parameterBlobIndex: 5,
    parameterRecordSha256: "48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51",
    programHash: "8adb20b2353020979dd6a7e367c803ae05111cabd4c0660265bc1810212230f7",
    programRecordSha256: "d0ae10bc6b4deea8f8837c6f6ea86b53d82009a94bb1aa28bfb63667d09c5cb3", programDataLength: 4599,
    requiredAttributes: matcapShadowAttributes, requiredUniforms: matcapShadowInstancedUniforms, keywordIndices: [5], keywordNames: ["INSTANCING_ON"],
    renderState: { zWrite: 1, zWriteProperty: "<noninit>", zTest: 4, zTestProperty: "<noninit>", culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
  },
};

function matcapGlsl(attributes, uniforms) {
  const sourceAttribute = (attribute) => attribute === "POSITION" ? "in_POSITION0" : attribute === "NORMAL" ? "in_NORMAL0" : attribute === "TEXCOORD_0" ? "in_TEXCOORD0" : "in_COLOR0";
  return ["#version 300 es", "#ifdef VERTEX", ...attributes.map((attribute) => `in mediump vec4 ${sourceAttribute(attribute)};`), ...uniforms.map((uniform) => `uniform mediump vec4 ${uniform};`), "#endif", "#ifdef FRAGMENT", "void main() {}", "#endif"].join("\n");
}

function matcapPass(name, spec, tampered = false) {
  return {
    ...spec, subShaderIndex: 0, stage: "vertex", platform: 9, gpuProgramType: 4,
    programDataSha256: tampered ? "0".repeat(64) : spec.programHash,
    programHash: tampered ? "0".repeat(64) : spec.programHash,
    glsl: matcapGlsl(spec.requiredAttributes, spec.requiredUniforms),
  };
}

function matcapProfile({ tamperedPass = false, tamperedColor = false, tamperedMain = false, tamperedMatcap = false, tamperedIdentity = false, tamperedState = false } = {}) {
  const profile = renderingProfile({ mouth: false });
  const slot = profile.renderers[0].materialSlots[0];
  slot.sourceMaterialReference = structuredClone(matcapMaterialReference);
  slot.sourceMaterialName = "FX_MAT_Matcap_01";
  slot.sourceShaderReference = structuredClone(matcapSourceReference);
  slot.sourceShaderName = "DSFX/FX_SHADER_Matcap";
  slot.sourceShaderParsedName = tamperedIdentity ? "DSFX/FX_SHADER_Glitch_Tex" : "DSFX/FX_SHADER_Matcap";
  slot.shaderProgramBlobSha256 = matcapProgramBlobSha256;
  slot.adapterId = "dsfx-matcap";
  slot.materialProperties = {
    floats: { ...matcapInertFloats, _ZWrite_Mode: 1, _Cull_Mode: 2 }, ints: {},
    colors: {
      ...structuredClone(matcapInertColors),
      _Main_Color: tamperedColor ? { r: 1, g: 0, b: 0, a: 1 } : { r: 0.30188679695129395, g: 0.055614907294511795, b: 0, a: 0.772549033164978 },
    },
    keywords: [],
    textures: [
      { name: "_Main_Tex", texture: { file: matcapMainTextureReference.serializedFile, pathId: tamperedMain ? "999" : matcapMainTextureReference.objectId }, textureReference: structuredClone(matcapMainTextureReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      { name: "_Matcap_Tex", texture: { file: matcapTextureReference.serializedFile, pathId: tamperedMatcap ? "999" : matcapTextureReference.objectId }, textureReference: structuredClone(matcapTextureReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      { name: "_texcoord", texture: { file: matcapMaterialReference.serializedFile, pathId: "0" }, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    ],
    resolvedTextures: [
      { property: "_Main_Tex", name: "MatcapMain", width: 64, height: 64, sourceReference: structuredClone(matcapMainTextureReference) },
      { property: "_Matcap_Tex", name: "Matcap", width: 64, height: 64, sourceReference: structuredClone(matcapTextureReference) },
    ],
  };
  slot.adapterSettings = { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: [0.30188679695129395, 0.055614907294511795, 0, 0.772549033164978] };
  slot.renderState = {
    sourceQueue: -1, layer: "transparent", alphaMode: "BLEND", depthWrite: true, depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false,
    blend: { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: tamperedState ? 1 : 0, operationAlpha: 0 }, polygonOffsetFactor: 0, polygonOffsetUnits: 0,
  };
  slot.matcapShaderExtraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: "2021.3", fingerprint: matcapFingerprint,
    sourceReference: structuredClone(matcapSourceReference), compressedBlobSha256: matcapProgramBlobSha256, shaderName: "DSFX/FX_SHADER_Matcap",
    shaderKeywordNames: matcapShaderKeywords, requiredProperties: matcapRequiredProperties, requiredTextureProperties: matcapRequiredTextureProperties,
    passes: Object.fromEntries(Object.entries(matcapPassSpecs).map(([name, spec]) => [name, matcapPass(name, spec, tamperedPass && name === "forward")])),
  };
  return profile;
}

function builtinQuadReference({ guid = "0".repeat(32), pathId = "10210", file = "unity default resources", name = "Quad" } = {}) {
  return {
    file, pathId, externalGuid: guid,
    builtinResource: { kind: "unity-builtin-resource", guid, file, pathId, name },
  };
}

function builtinQuadProfile() {
  const rendererReference = { bundleSha256: "a".repeat(64), serializedFile: "CAB-fixture", objectId: "7" };
  const materialReference = { bundleSha256: "b".repeat(64), serializedFile: "CAB-materials", objectId: "9" };
  const sourceMesh = builtinQuadReference({ guid: "00000000000000000e00000000000000" });
  const slot = {
    slot: 0, sourceMaterialReference: materialReference, sourceMaterialName: "Fixture_Body",
    sourceShaderReference: null, sourceShaderName: "Unlit/Texture", sourceShaderParsedName: "Unlit/Texture",
    shaderProgramBlobSha256: "f".repeat(64), adapterId: "gltf-native",
    materialProperties: { floats: {}, ints: {}, colors: {}, textures: [] },
    adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: null },
    renderState: { sourceQueue: 2000, layer: "opaque", alphaMode: "OPAQUE", depthWrite: true, depthTest: true,
      depthFunction: "less-equal", cullMode: "back", doubleSided: false, blend: { source: 1, destination: 0 },
      polygonOffsetFactor: 0, polygonOffsetUnits: 0 },
    glb: null,
  };
  const profile = {
    schemaVersion: 1, profileVersion: "chibi-rendering-profile-v3", adapterVersion: "mx-character-adapters-v5",
    sourceIdentity: "fixture", dependencyFingerprint: "fixture-fingerprint",
    sourcePrefab: { path: "Assets/Fixture.prefab", reference: rendererReference },
    renderers: [{ sourceReference: rendererReference, name: "Fixture_Body", hierarchyPath: "Fixture/Body",
      rendererType: "MeshRenderer", defaultVisible: false, sourceMesh, glbNodeIndex: null, materialSlots: [slot] }],
    mouth: null, drawSequence: [`${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}`],
    validation: { valid: true, unresolved: [] },
  };
  const document = {
    asset: { version: "2.0" }, buffers: [{ byteLength: 0 }], bufferViews: [], accessors: [],
    scenes: [{ nodes: [0] }], scene: 0,
    nodes: [
      { name: "RootNode", children: [1] },
      { name: "Fixture", children: [2], translation: [1, 2, 3], rotation: [0, 0, 0, 1], scale: [2, 3, 4], extras: { sourceMarker: "keep" } },
      { name: "Body", translation: [-1, 0.25, 0.5], rotation: [0, 0, 0, 1], scale: [0.5, 0.75, 1.25], children: [3] },
      { name: "Child", translation: [0, 1, 0] },
    ],
    meshes: [], materials: [{ name: "Fixture_Body" }], animations: [],
  };
  return { profile, document };
}

test("accepts known transparent Saya material shader families", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithMaterials(["Saya_Original_Mouse_Glass", "Saya_Original_Mouse_Glass_Inside"]));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "saya_original",
      exportClips: [],
      materialMetadata: [
        { name: "Saya_Original_Mouse_Glass", shaderName: "Unlit_Tex_Col_HDR" },
        { name: "Saya_Original_Mouse_Glass_Inside", shaderName: "FX_SHADER_AlphaBlend_Add_0" },
      ],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.deepEqual(document.materials.map((material) => material.alphaMode), ["BLEND", "BLEND"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts character prop, matcap, and environmental shader families", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    const materials = [
      ["Water", "MXEnvWaterV2"],
      ["Steam", "FX_SHADER_AlphaBlend_0"],
      ["Furniture", "MXEnvStandard"],
      ["Food", "FX_SHADER_Matcap"],
      ["Weapon", "MXWeapon"],
    ];
    await writeFile(input, glbWithMaterials(materials.map(([name]) => name)));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture",
      exportClips: [],
      materialMetadata: materials.map(([name, shaderName]) => ({ name, shaderName })),
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.materials[0].alphaMode, "BLEND");
    assert.equal(document.materials[1].alphaMode, "BLEND");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("can force a verified source prop from blended alpha to a cutout", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithMaterials(["CH0058_BeachTube"]));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "ch0058",
      exportClips: [],
      forceMaskMaterials: ["CH0058_BeachTube"],
      materialMetadata: [{ name: "CH0058_BeachTube", shaderName: "MXWeapon" }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.materials[0].alphaMode, "MASK");
    assert.equal(document.materials[0].alphaCutoff, 0.5);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps face and eyebrow shaders opaque while alpha-testing eye-mouth sprites", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithMaterials(["Face", "EyeMouth", "Eyebrow"]));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture",
      exportClips: [],
      materialMetadata: [
        { name: "Face", shaderName: "MXCharacterFaceV2" },
        { name: "EyeMouth", shaderName: "MXCharacterEyesMouthV2" },
        { name: "Eyebrow", shaderName: "MXCharacterEyebrowV2Simple" },
      ],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.deepEqual(document.materials.map((material) => material.alphaMode), ["OPAQUE", "MASK", "OPAQUE"]);
    assert.equal(document.materials[1].alphaCutoff, 0.5);
    assert.equal(document.materials[1].doubleSided, undefined);
    assert.deepEqual(document.materials[1].extras?.chibi, { depthWrite: false, depthTest: false, renderOrder: 20, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps opaque character body and hair shaders opaque despite texture alpha", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithMaterials(["Body", "Hair", "BodyTransparent", "HairTransparent"]));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture",
      exportClips: [],
      materialMetadata: [
        { name: "Body", shaderName: "MXCharacterGeneralV2" },
        { name: "Hair", shaderName: "MXCharacterHairV2" },
        { name: "BodyTransparent", shaderName: "MXCharacterGeneralV2Transparent" },
        { name: "HairTransparent", shaderName: "MXCharacterHairV2_Transparent" },
      ],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.deepEqual(document.materials.map((material) => material.alphaMode), ["OPAQUE", "OPAQUE", "BLEND", "BLEND"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rebinds explicitly exported source textures dropped by FBX2glTF", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    const texture = path.join(root, "body.png");
    await writeFile(input, glbWithMaterials(["Fixture_Body"]));
    await writeFile(texture, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64"));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [],
      materialMetadata: [{ name: "Fixture_Body", shaderName: "MXCharacterGeneralV2" }],
      materialTextureOverrides: [{ material: "Fixture_Body", path: texture, textureName: "Fixture_B⁯ody" }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.materials[0].pbrMetallicRoughness.baseColorTexture.index, 0);
    assert.equal(document.images[0].name, "Fixture_B⁯ody");
    assert.equal(document.materials[0].alphaMode, "OPAQUE");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("uses character material names as an opaque fallback when shader metadata is absent", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithMaterials(["Fixture_Body", "Fixture_Hair", "Fixture_Face", "Fixture_Eyebrow", "Fixture_Body_Alpha"]));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], materialMetadata: [] }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.deepEqual(document.materials.map((material) => material.alphaMode), ["OPAQUE", "OPAQUE", "OPAQUE", "OPAQUE", undefined]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("embeds unambiguous child-renderer face events for the viewer", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithFaceVariants());
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture",
      exportClips: [],
      materialMetadata: [{ name: "Fixture_Face", shaderName: "MXCharacterFaceV2" }],
      childRendererEvents: [
        { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_DisableChildRenderer", int: 3 },
        { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_EnableChildRenderer", int: 2 },
        { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_DisableChildRenderer", int: 4 },
      ],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.deepEqual(document.scenes[0].extras.chibi.rendererSlots, [
      { id: 2, nodes: ["Fixture_Face_Outline"] },
      { id: 3, nodes: ["Fixture_Face01_Outline"] },
      { id: 4, nodes: ["Fixture_Face02_Outline"] },
    ]);
    assert.equal(document.scenes[0].extras.chibi.rendererEvents.length, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("maps mesh face variants across exporter naming styles and ignores helper renderer IDs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    const document = {
      asset: { version: "2.0" }, buffers: [{ byteLength: 0 }], scenes: [{ nodes: [0] }], scene: 0,
      nodes: [
        { name: "Root", children: [1, 2, 3, 4] },
        { name: "CH0348_Face01_Mesh", mesh: 0 },
        { name: "CH0348_Face02_Mesh", mesh: 0 },
        { name: "CH0348_Face03_Mesh", mesh: 0 },
        { name: "FX_CH0348_Motion_Pickup_Face_01" },
      ], meshes: [{ primitives: [] }], materials: [], animations: [],
    };
    const source = Buffer.from(JSON.stringify(document));
    const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
    const glb = Buffer.alloc(12 + 8 + json.length + 8);
    glb.write("glTF"); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
    glb.writeUInt32LE(json.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); json.copy(glb, 20);
    const binaryOffset = 20 + json.length; glb.writeUInt32LE(0, binaryOffset); glb.writeUInt32LE(0x004e4942, binaryOffset + 4);
    await writeFile(input, glb);
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], childRendererEvents: [
      { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_DisableChildRenderer", int: 1 },
      { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_EnableChildRenderer", int: 2 },
      { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_DisableChildRenderer", int: 3 },
      { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_DisableChildRenderer", int: 9 },
    ] }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const outputJson = readGlbJson(await readFile(output));
    assert.deepEqual(outputJson.scenes[0].extras.chibi.rendererSlots, [
      { id: 1, nodes: ["CH0348_Face01_Mesh"] },
      { id: 2, nodes: ["CH0348_Face02_Mesh"] },
      { id: 3, nodes: ["CH0348_Face03_Mesh"] },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("binds the initial renderer ID to the unique EyeMouth face mesh", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithEyeMouthFaceVariants());
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], profile: { initialPose: "Fixture_Cafe_Idle" },
      childRendererEvents: [
        { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_DisableChildRenderer", int: 3 },
        { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_EnableChildRenderer", int: 4 },
      ],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const outputJson = readGlbJson(await readFile(output));
    assert.deepEqual(outputJson.scenes[0].extras.chibi.rendererSlots, [
      { id: 3, nodes: ["Fixture_Face01_Outline"] },
      { id: 4, nodes: ["Fixture_Face_Outline"] },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("maps face IDs from source assembly enabled state when suffix order is reversed", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithEyeMouthFaceVariants());
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], profile: { initialPose: "Fixture_Cafe_Idle" },
      assembly: { renderers: [
        { name: "Fixture_Face_Outline", enabled: true },
        { name: "Fixture_Face01_Outline", enabled: false },
      ] },
      childRendererEvents: [
        { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_EnableChildRenderer", int: 3 },
        { clip: "Fixture_Cafe_Idle", time: 0, function: "AniEvt_DisableChildRenderer", int: 4 },
      ],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const outputJson = readGlbJson(await readFile(output));
    assert.deepEqual(outputJson.scenes[0].extras.chibi.rendererSlots, [
      { id: 3, nodes: ["Fixture_Face_Outline"] },
      { id: 4, nodes: ["Fixture_Face01_Outline"] },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("repairs out-of-range skin indices before Three.js renders", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithInvalidSkinIndex());
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [] }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual([...readGlbBinary(await readFile(output))], [0, 0, 0, 0]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("repairs only a present non-ancestor skin root and records the exact LCA proof", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-skin-skeleton-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const bytes = glbWithSkinSkeleton(1, document => {
      document.scenes[0].extras = { chibi: { renderingProfileDiagnostics: { schemaVersion: 1, policyVersion: "fixture" } } };
    });
    await writeFile(input, bytes);
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [] }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const outputBytes = await readFile(output), document = readGlbJson(outputBytes);
    assert.equal(document.skins[0].skeleton, 0);
    assert.deepEqual([...readGlbBinary(outputBytes)], [...readGlbBinary(bytes)]);
    assert.deepEqual(document.scenes[0].extras.chibi.renderingProfileDiagnostics, {
      schemaVersion: 1, policyVersion: "fixture", skinSkeletonMetadataVersion: CHIBI_SKIN_SKELETON_METADATA_VERSION,
      skinSkeletonRepairs: [{
        schemaVersion: 1, policyVersion: CHIBI_SKIN_SKELETON_METADATA_VERSION, skinIndex: 0,
        previousSkeleton: 1, repairedSkeleton: 0, jointIndices: [2, 4],
        jointAncestorPaths: [[0, 1, 2], [0, 3, 4]], reasonCode: "PRESENT_SKELETON_NOT_COMMON_ANCESTOR",
      }],
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("postprocess leaves valid and omitted skin.skeleton fields unchanged", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-skin-skeleton-valid-"));
  try {
    const config = path.join(root, "config.json");
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [] }));
    for (const skeleton of [0, undefined]) {
      const input = path.join(root, `input-${skeleton ?? "omitted"}.glb`);
      const output = path.join(root, `output-${skeleton ?? "omitted"}.glb`);
      const bytes = glbWithSkinSkeleton(skeleton, document => {
        document.scenes[0].extras = { chibi: { renderingProfileDiagnostics: {} } };
      });
      await writeFile(input, bytes);
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.equal(result.code, 0, result.stderr);
      const document = readGlbJson(await readFile(output));
      if (skeleton === undefined) assert.equal(Object.hasOwn(document.skins[0], "skeleton"), false);
      else assert.equal(document.skins[0].skeleton, 0);
      assert.deepEqual(document.scenes[0].extras.chibi.renderingProfileDiagnostics.skinSkeletonRepairs, []);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("skin-root normalization rejects corrupt or ambiguous joint graphs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-skin-skeleton-invalid-"));
  try {
    const config = path.join(root, "config.json");
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [] }));
    const cases = [
      ["invalid skeleton index", document => { document.skins[0].skeleton = 99; }],
      ["multiple parents", document => { document.nodes[0].children.push(2); }],
      ["cycle", document => { document.nodes[2].children = [1]; }],
      ["duplicate joints", document => { document.skins[0].joints = [2, 2]; }],
      ["disconnected roots", document => {
        document.nodes = [{ name: "Joint A" }, { name: "Joint B" }];
        document.skins[0].joints = [0, 1]; document.skins[0].skeleton = 0;
      }],
    ];
    for (const [label, mutate] of cases) {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb");
      await writeFile(input, glbWithSkinSkeleton(1, mutate));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0, label);
      assert.match(result.stderr, /Skin skeleton metadata/, label);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("removes non-finite exported vertex colors from equipment", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithInvalidVertexColor());
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [] }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.meshes[0].primitives[0].attributes.COLOR_0, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("strips a verified source-specific vertex color channel", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithEyeMouthGeometry());
    await writeFile(config, JSON.stringify({
      sourceIdentity: "ch0058", exportClips: [],
      removeVertexColorMaterials: ["Fixture_EyeMouth"],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.meshes[0].primitives[0].attributes.COLOR_0, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps the equipment renderer selected by the source assembly", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithAssemblyNodes());
    await writeFile(config, JSON.stringify({
      sourceIdentity: "shun_original",
      exportClips: [],
      removeMeshes: ["Shun_Original_Weapon", "Shun_Original_Alternate"],
      assembly: {
        root: "Cafe_Shun_Original",
        rendererOrder: ["Shun_Original_Weapon"],
        renderers: [{ name: "Shun_Original_Weapon", enabled: true }],
        attachments: { equipmentRenderers: ["Shun_Original_Weapon"] },
      },
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.nodes.find((node) => node.name === "Shun_Original_Weapon").mesh, 0);
    assert.equal(document.nodes.find((node) => node.name === "Shun_Original_Alternate").mesh, undefined);
    assert.equal(document.scenes[0].extras.chibi.assembly.root, "Cafe_Shun_Original");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recognizes an eye-mouth material by name when legacy shader metadata is absent", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithMaterials(["CH0187_EyeMouth"]));
    await writeFile(config, JSON.stringify({ sourceIdentity: "ch0211", exportClips: [], materialMetadata: [] }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.materials[0].alphaMode, "MASK");
    assert.equal(document.materials[0].alphaCutoff, 0.5);
    assert.deepEqual(document.materials[0].extras?.chibi, { depthWrite: false, depthTest: false, renderOrder: 20, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recognizes the legacy EyeMoutn spelling as an eye-mouth layer", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithMaterials(["CH0163_EyeMoutn"]));
    await writeFile(config, JSON.stringify({ sourceIdentity: "ch0163", exportClips: [], materialMetadata: [] }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.materials[0].alphaMode, "OPAQUE");
    assert.equal(document.materials[0].alphaCutoff, undefined);
    assert.equal(document.materials[0].extras?.chibi, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('fallback mouth preserves source atlas dimensions, UVs and animation flip metadata', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-source-mouth-'));
  try {
    const input = path.join(root, 'input.glb'), output = path.join(root, 'output.glb');
    const config = path.join(root, 'config.json'), mouth = path.join(root, 'mouth.png');
    const source = glbWithEyeMouthGeometry(['Fixture_EyeMouth']);
    await writeFile(input, source);
    await writeFile(mouth, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==', 'base64'));
    for (const [columns, rows, scale] of [[4, 4, 1], [8, 8, .5]]) {
      const mouthAtlas = { columns, rows, defaultTile: 1, scaleX: scale, scaleY: scale };
      const mouthTiles = { Idle: [[0, 0, true]], Touch: [[0, 103, false]] };
      await writeFile(config, JSON.stringify({ sourceIdentity: 'fixture', exportClips: [], mouthTexturePath: mouth,
        mouthAtlas, mouthTiles, eyeMouthMaterialNames: ['Fixture_EyeMouth'] }));
      const result = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
      assert.equal(result.code, 0, result.stderr);
      const document = readGlbJson(await readFile(output));
      const material = document.materials.find(m => m.extras?.mouthAtlas);
      assert.deepEqual(material.extras.mouthAtlas, mouthAtlas);
      assert.deepEqual(material.extras.mouthTiles, mouthTiles);
      assert.deepEqual(material.pbrMetallicRoughness.baseColorTexture.extensions.KHR_texture_transform,
        { offset: [1 / columns, 1 - scale], scale: [scale, scale] });
      assert.ok(document.extensionsUsed.includes('KHR_texture_transform'));
      const mouthPrimitive = document.meshes[0].primitives.find(p => p.material === document.materials.indexOf(material));
      const a = document.accessors[mouthPrimitive.attributes.TEXCOORD_0], view = document.bufferViews[a.bufferView];
      const binary = readGlbBinary(await readFile(output));
      const original = readGlbJson(source), originalAccessor = original.accessors[original.meshes[0].primitives[0].attributes.TEXCOORD_0];
      const originalView = original.bufferViews[originalAccessor.bufferView];
      assert.deepEqual(binary.subarray(view.byteOffset, view.byteOffset + view.byteLength),
        readGlbBinary(source).subarray(originalView.byteOffset, originalView.byteOffset + originalView.byteLength));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("keeps the legacy EyeMoutn material opaque after mouth extraction", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    const mouth = path.join(root, "mouth.png");
    await writeFile(input, glbWithEyeMouthGeometry(["CH0163_EyeMoutn"]));
    await writeFile(mouth, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64"));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "ch0163",
      exportClips: [],
      mouthTexturePath: mouth,
      mouthTiles: { CH0163_Cafe_Idle: [[0, 300]] },
      mouthDefaultTile: 300,
      eyeMouthMaterialNames: ["CH0163_EyeMoutn"],
      materialMetadata: [{ name: "CH0163_EyeMoutn", shaderName: "MXCharacterEyesMouthV2" }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.materials[0].alphaMode, "OPAQUE");
    assert.equal(document.materials[0].alphaCutoff, undefined);
    assert.equal(document.materials[0].extras?.chibi, undefined);
    assert.equal(document.meshes[0].primitives.length, 2);
    assert.deepEqual(document.materials[1].extras.mouthAtlas, { columns: 8, rows: 8, defaultTile: 300 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("drops the eye shader's ignored vertex color when mouth geometry is separated", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    const mouth = path.join(root, "mouth.png");
    await writeFile(input, glbWithEyeMouthGeometry());
    await writeFile(mouth, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64"));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture",
      exportClips: [],
      mouthTexturePath: mouth,
      mouthTiles: { Fixture_Cafe_Idle: [[0, 300]] },
      mouthDefaultTile: 300,
      eyeMouthMaterialNames: ["Fixture_EyeMouth"],
      materialMetadata: [{ name: "Fixture_EyeMouth", shaderName: "MXCharacterEyesMouthV2" }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.meshes[0].primitives.length, 2);
    assert.equal(document.meshes[0].primitives[0].attributes.COLOR_0, undefined);
    assert.equal(document.meshes[0].primitives[1].attributes.COLOR_0, undefined);
    assert.equal(document.materials[0].alphaMode, "MASK");
    assert.equal(document.materials[0].alphaCutoff, 0.5);
    assert.equal(document.materials[0].doubleSided, undefined);
    assert.deepEqual(document.materials[0].extras?.chibi, { depthWrite: false, depthTest: false, renderOrder: 20, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    assert.deepEqual(document.materials[1].extras.mouthAtlas, { columns: 8, rows: 8, defaultTile: 300 });
    assert.equal(document.materials[1].doubleSided, undefined);
    assert.deepEqual(document.materials[1].extras.chibi, { depthWrite: false, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("orders shared-mesh face primitives before eye and mouth layers", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    const mouth = path.join(root, "mouth.png");
    await writeFile(input, glbWithEyeMouthGeometry(["Fixture_EyeMouth", "Fixture_Face"]));
    await writeFile(mouth, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64"));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture",
      exportClips: [],
      mouthTexturePath: mouth,
      mouthTiles: { Fixture_Cafe_Idle: [[0, 300]] },
      mouthDefaultTile: 300,
      eyeMouthMaterialNames: ["Fixture_EyeMouth"],
      materialMetadata: [{ name: "Fixture_EyeMouth", shaderName: "MXCharacterEyesMouthV2" }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.deepEqual(document.meshes[0].primitives.map((primitive) => document.materials[primitive.material].name), ["Fixture_Face", "Fixture_EyeMouth", "fixture_Mouth"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("drops an all-zero eye vertex alpha mask after mouth geometry is separated", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    const mouth = path.join(root, "mouth.png");
    await writeFile(input, glbWithEyeMouthGeometry(["Fixture_EyeMouth"], [0, 0, 0]));
    await writeFile(mouth, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64"));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture",
      exportClips: [],
      mouthTexturePath: mouth,
      mouthDefaultTile: 300,
      eyeMouthMaterialNames: ["Fixture_EyeMouth"],
      materialMetadata: [{ name: "Fixture_EyeMouth", shaderName: "MXCharacterEyesMouthV2" }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.meshes[0].primitives[0].attributes.COLOR_0, undefined);
    assert.equal(document.meshes[0].primitives[1].attributes.COLOR_0, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("processes suffixed duplicates of a configured eye-mouth material", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    const mouth = path.join(root, "mouth.png");
    await writeFile(input, glbWithEyeMouthGeometry(["Fixture_EyeMouth", "Fixture_EyeMouth.001"]));
    await writeFile(mouth, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64"));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture",
      exportClips: [],
      mouthTexturePath: mouth,
      mouthDefaultTile: 300,
      eyeMouthMaterialNames: ["Fixture_EyeMouth"],
      materialMetadata: [{ name: "Fixture_EyeMouth", shaderName: "MXCharacterEyesMouthV2" }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.meshes[0].primitives.length, 4);
    assert.equal(document.meshes[0].primitives.filter((primitive) => primitive.material < 2).every((primitive) => primitive.attributes.COLOR_0 === undefined), true);
    assert.equal(document.meshes[0].primitives.filter((primitive) => primitive.material === 2).every((primitive) => primitive.attributes.COLOR_0 === undefined), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("removes invalid exported vertex colors from halo geometry", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-postprocess-"));
  try {
    const input = path.join(root, "input.glb");
    const output = path.join(root, "output.glb");
    const config = path.join(root, "config.json");
    await writeFile(input, glbWithEyeMouthGeometry(["Fixture_Halo"]));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture",
      exportClips: [],
      materialMetadata: [{ name: "Fixture_Halo", shaderName: "MXCharacterHaloTex" }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.meshes[0].primitives[0].attributes.COLOR_0, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('full profile general rim-mask shaders omit mask colors while other general shaders retain them', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-body-mask-'));
  try {
    const input = path.join(root, 'input.glb'), output = path.join(root, 'output.glb'), config = path.join(root, 'config.json');
    const bytes = glbWithProfileRenderer(undefined, false, true);
    const document = readGlbJson(bytes);
    document.meshes[0].primitives[0].attributes.COLOR_0 = 2;
    const binary = readGlbBinary(bytes);
    const encoded = Buffer.from(JSON.stringify(document));
    const padded = Buffer.concat([encoded, Buffer.alloc((4 - encoded.length % 4) % 4, 32)]);
    const header = Buffer.from(bytes.subarray(0, 20));
    header.writeUInt32LE(28 + padded.length + binary.length, 8);
    header.writeUInt32LE(padded.length, 12);
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942, 4);
    await writeFile(input, Buffer.concat([header, padded, binHeader, binary]));
    for (const shader of ['MX/C-General', 'MX/C-General/Layer4', 'MX/C-General/Transparent', 'MX/C-Hair', 'Other/Hair']) {
      const profile = renderingProfile({ mouth: false, extraEyeMouthSlot: true });
      Object.assign(profile.renderers[0].materialSlots[0], {
        adapterId: shader.endsWith('Hair') ? 'mx-character-hair' : 'mx-character-general', sourceShaderName: shader, sourceShaderParsedName: shader,
      });
      await writeFile(config, JSON.stringify({ exportClips: [], renderingProfile: profile }));
      const result = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
      assert.equal(result.code, 0, result.stderr);
      const json = readGlbJson(await readFile(output));
      assert.equal(Number.isInteger(json.meshes[0].primitives[0].attributes.COLOR_0), ['MX/C-General', 'Other/Hair'].includes(shader));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('face shader mask RGB does not tint the face and vertex alpha is preserved', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-face-mask-'));
  try {
    const bytes = glbWithProfileRenderer(undefined, false, true);
    const document = readGlbJson(bytes);
    document.meshes[0].primitives[0].attributes.COLOR_0 = 2;
    const binary = readGlbBinary(bytes);
    const colorOffset = document.bufferViews[document.accessors[2].bufferView].byteOffset;
    for (let i = 0; i < 6; i++) {
      binary.writeFloatLE(0, colorOffset + i * 16);
      binary.writeFloatLE(.25, colorOffset + i * 16 + 12);
    }
    const profile = renderingProfile({ mouth: false, extraEyeMouthSlot: true });
    Object.assign(profile.renderers[0].materialSlots[0], {
      adapterId: 'mx-character-face', sourceShaderName: 'MXCharacterFaceV2', sourceShaderParsedName: 'MX/C-Face',
    });
    const input = path.join(root, 'input.glb'), output = path.join(root, 'output.glb'), config = path.join(root, 'config.json');
    const jsonBytes = Buffer.from(JSON.stringify(document));
    const padded = Buffer.concat([jsonBytes, Buffer.alloc((4 - jsonBytes.length % 4) % 4, 32)]);
    const header = Buffer.from(bytes.subarray(0, 20));
    header.writeUInt32LE(28 + padded.length + binary.length, 8);
    header.writeUInt32LE(padded.length, 12);
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942, 4);
    await writeFile(input, Buffer.concat([header, padded, binHeader, binary]));
    await writeFile(config, JSON.stringify({ exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const repaired = await readFile(output), json = readGlbJson(repaired), bin = readGlbBinary(repaired);
    const accessor = json.accessors[json.meshes[0].primitives[0].attributes.COLOR_0];
    const start = json.bufferViews[accessor.bufferView].byteOffset;
    assert.deepEqual(Array.from({ length: 4 }, (_, i) => bin.readFloatLE(start + i * 4)), [1, 1, 1, .25]);
    assert.equal(json.meshes[0].primitives[1].attributes.COLOR_0, undefined);
    await writeFile(config, JSON.stringify({ exportClips: [], incompleteImport: {
      warnings: ['Unrelated source weight decoding failed'], materialSlots: profile.renderers[0].materialSlots,
    } }));
    const fallback = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
    assert.equal(fallback.code, 0, fallback.stderr);
    const fallbackBytes = await readFile(output), fallbackJson = readGlbJson(fallbackBytes), fallbackBin = readGlbBinary(fallbackBytes);
    const fallbackAccessor = fallbackJson.accessors[fallbackJson.meshes[0].primitives[0].attributes.COLOR_0];
    const fallbackStart = fallbackJson.bufferViews[fallbackAccessor.bufferView].byteOffset;
    assert.deepEqual(Array.from({ length: 4 }, (_, i) => fallbackBin.readFloatLE(fallbackStart + i * 4)), [1, 1, 1, .25]);
    assert.ok(fallbackJson.scenes[0].extras.chibi.incompleteImport.warnings.includes('Unrelated source weight decoding failed'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("binds a source rendering profile and splits its exact mouth slot without legacy EyeMouth overrides", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-postprocess-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), atlas = path.join(root, "mouth.png");
    await writeFile(input, glbWithProfileRenderer());
    await writeFile(atlas, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const profile = renderingProfile();
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: profile, mouthTexturePath: atlas,
      materialMetadata: [{ name: "Fixture_EyeMouth", shaderName: "MXCharacterEyesMouthV2" }],
      forceMaskMaterials: ["Fixture_EyeMouth"], flipEyeMouthV: ["Fixture_EyeMouth"],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const outputBytes = await readFile(output);
    const document = readGlbJson(outputBytes);
    const binaryChunkOffset = 20 + outputBytes.readUInt32LE(12);
    assert.equal(document.buffers[0].byteLength, outputBytes.readUInt32LE(binaryChunkOffset));
    const embedded = document.scenes[0].extras.chibi.renderingProfile;
    assert.equal(embedded.validation.valid, true);
    assert.equal(embedded.renderers[0].glbNodeIndex, 2);
    assert.deepEqual(embedded.renderers[0].materialSlots[0].glb.primitiveIndices, [0]);
    assert.deepEqual(embedded.mouth.glbPrimitiveIndices, { eyes: [0], mouth: [1] });
    assert.equal(embedded.mouth.glbMaterialIndex, 1);
    assert.equal(document.meshes[0].primitives.length, 2);
    assert.deepEqual(document.nodes[2].extras.chibi.sourceRenderer.sourceMeshReference, profile.renderers[0].sourceMesh.sourceReference);
    assert.deepEqual(document.materials[0].extras.chibi.sourceMaterialReference, profile.renderers[0].materialSlots[0].sourceMaterialReference);
    assert.deepEqual(document.materials[0].extras.chibi.sourceShaderReference, profile.renderers[0].materialSlots[0].sourceShaderReference);
    assert.equal(document.meshes[0].primitives[1].attributes.TEXCOORD_0, 0, "mouth vertex UVs stay unmodified because the material transform handles atlas selection");
    assert.equal(document.materials[0].alphaMode, "BLEND");
    assert.equal(document.materials[0].extras.chibi.depthWrite, true);
    assert.equal(document.materials[0].extras.chibi.depthTest, true);
    assert.deepEqual(document.materials[1].pbrMetallicRoughness.baseColorTexture.extensions.KHR_texture_transform, { offset: [0.125, -0.125], scale: [0.5, 0.5] });
    assert.deepEqual(document.materials[1].extras.mouthTiles.Fixture_Cafe_Idle, [[0.5, 203, true]]);
    assert.ok(document.extensionsUsed.includes("KHR_texture_transform"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("synthesizes exact Unity built-in Quads with source transforms, visibility, and provenance", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-builtin-quad-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const fixture = builtinQuadProfile();
    await writeFile(input, (() => {
      const source = Buffer.from(JSON.stringify(fixture.document));
      const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
      const output = Buffer.alloc(12 + 8 + json.length + 8);
      output.write("glTF"); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
      output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
      const binaryOffset = 20 + json.length; output.writeUInt32LE(0, binaryOffset); output.writeUInt32LE(0x004e4942, binaryOffset + 4);
      return output;
    })());
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: fixture.profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const outputBytes = await readFile(output);
    const document = readGlbJson(outputBytes);
    const binary = readGlbBinary(outputBytes);
    const node = document.nodes[2], mesh = document.meshes[node.mesh], primitive = mesh.primitives[0];
    assert.deepEqual(node.translation, [-1, 0.25, 0.5]);
    assert.deepEqual(node.rotation, [0, 0, 0, 1]);
    assert.deepEqual(node.scale, [0.5, 0.75, 1.25]);
    assert.deepEqual(node.children, [3]);
    assert.equal(node.visible, undefined);
    assert.equal(document.nodes[1].extras.sourceMarker, "keep");
    assert.deepEqual(node.extras.chibi.synthesizedBuiltinResource, {
      kind: "unity-builtin-resource", guid: "00000000000000000e00000000000000", file: "unity default resources", pathId: "10210", name: "Quad",
    });
    assert.deepEqual(node.extras.chibi.sourceRenderer.sourceMeshBuiltinResource, node.extras.chibi.synthesizedBuiltinResource);
    assert.equal(node.extras.chibi.sourceRenderer.defaultVisible, false);
    assert.equal(node.skin, undefined);
    assert.deepEqual(mesh.extras.chibi.synthesizedBuiltinResource, node.extras.chibi.synthesizedBuiltinResource);
    assert.equal(primitive.mode, 4);
    assert.deepEqual(readDocumentAccessor(document, binary, primitive.attributes.POSITION), [[-.5, -.5, 0], [-.5, .5, 0], [.5, .5, 0], [.5, -.5, 0]]);
    assert.deepEqual(readDocumentAccessor(document, binary, primitive.attributes.NORMAL), [[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]]);
    assert.deepEqual(readDocumentAccessor(document, binary, primitive.attributes.TEXCOORD_0), [[0, 0], [0, 1], [1, 1], [1, 0]]);
    assert.deepEqual(readDocumentAccessor(document, binary, primitive.indices), [[0], [1], [2], [0], [2], [3]]);
    assert.equal(document.accessors[primitive.attributes.POSITION].count, 4);
    assert.equal(document.accessors[primitive.indices].count, 6);
    assert.equal(primitive.attributes.JOINTS_0, undefined);
    assert.equal(primitive.attributes.WEIGHTS_0, undefined);
    assert.equal(primitive.material, 0);
    assert.deepEqual(document.materials[0].extras.chibi.sourceMaterialReference, fixture.profile.renderers[0].materialSlots[0].sourceMaterialReference);
    assert.equal(document.scenes[0].extras.chibi.renderingProfile.renderers[0].glbNodeIndex, 2);
    assert.deepEqual(document.scenes[0].extras.chibi.renderingProfile.renderers[0].sourceMesh.builtinResource, fixture.profile.renderers[0].sourceMesh.builtinResource);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("synthesizes an omitted built-in Quad material from its exact source identity", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-builtin-quad-material-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const fixture = builtinQuadProfile();
    fixture.document.materials = [];
    const source = Buffer.from(JSON.stringify(fixture.document));
    const json = Buffer.concat([source, Buffer.alloc((4 - (source.length % 4)) % 4, 0x20)]);
    const inputBytes = Buffer.alloc(12 + 8 + json.length + 8);
    inputBytes.write("glTF"); inputBytes.writeUInt32LE(2, 4); inputBytes.writeUInt32LE(inputBytes.length, 8);
    inputBytes.writeUInt32LE(json.length, 12); inputBytes.writeUInt32LE(0x4e4f534a, 16); json.copy(inputBytes, 20);
    inputBytes.writeUInt32LE(0, 20 + json.length); inputBytes.writeUInt32LE(0x004e4942, 24 + json.length);
    await writeFile(input, inputBytes);
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: fixture.profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const material = document.materials[0];
    assert.equal(material.name, "Fixture_Body");
    assert.equal(material.extras.chibi.synthesizedBuiltinMaterial, true);
    assert.deepEqual(material.extras.chibi.sourceMaterialReference, fixture.profile.renderers[0].materialSlots[0].sourceMaterialReference);
    assert.equal(document.meshes[document.nodes[2].mesh].primitives[0].material, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unknown or null Unity built-in Quad references instead of guessing", async () => {
  for (const change of [
    { guid: "f".repeat(32) },
    { pathId: "0" },
    { file: "named-Quad" },
  ]) {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-builtin-reject-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const fixture = builtinQuadProfile();
      Object.assign(fixture.profile.renderers[0].sourceMesh, change);
      Object.assign(fixture.profile.renderers[0].sourceMesh.builtinResource, change);
      const source = Buffer.from(JSON.stringify(fixture.document));
      const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
      const inputBytes = Buffer.alloc(12 + 8 + json.length + 8);
      inputBytes.write("glTF"); inputBytes.writeUInt32LE(2, 4); inputBytes.writeUInt32LE(inputBytes.length, 8);
      inputBytes.writeUInt32LE(json.length, 12); inputBytes.writeUInt32LE(0x4e4f534a, 16); json.copy(inputBytes, 20);
      inputBytes.writeUInt32LE(0, 20 + json.length); inputBytes.writeUInt32LE(0x004e4942, 24 + json.length);
      await writeFile(input, inputBytes);
      await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: fixture.profile }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /unknown or incomplete Unity built-in mesh identity/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("rejects a built-in Quad material when the unique name has conflicting source provenance", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-builtin-material-identity-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const fixture = builtinQuadProfile();
    fixture.document.materials[0].extras = { chibi: { sourceMaterialReference: {
      bundleSha256: "c".repeat(64), serializedFile: "CAB-other-materials", objectId: "10",
    } } };
    const source = Buffer.from(JSON.stringify(fixture.document));
    const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
    const inputBytes = Buffer.alloc(12 + 8 + json.length + 8);
    inputBytes.write("glTF"); inputBytes.writeUInt32LE(2, 4); inputBytes.writeUInt32LE(inputBytes.length, 8);
    inputBytes.writeUInt32LE(json.length, 12); inputBytes.writeUInt32LE(0x4e4f534a, 16); json.copy(inputBytes, 20);
    inputBytes.writeUInt32LE(0, 20 + json.length); inputBytes.writeUInt32LE(0x004e4942, 24 + json.length);
    await writeFile(input, inputBytes);
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: fixture.profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /conflicting GLB source provenance/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails closed for exported mesh nodes with no exact source rendering-profile binding", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-unprofiled-geometry-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, true));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: renderingProfile({ mouth: false }) }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Unresolved unprofiled geometry may be required character\/weapon content: Fixture\/Unprofiled \(node 3\)/);
    assert.equal(await access(output).then(() => true, () => false), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("omits only an exact source-evidenced presentation renderer and records excluded events", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-presentation-exclusion-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: renderingProfileWithPresentationExclusion() }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.nodes[2].mesh, 0, "core body geometry remains bound");
    assert.equal(document.nodes[3].mesh, undefined, "the exact excluded presentation node is omitted");
    assert.equal(document.nodes[3].extras.chibi.presentationOnlyExcluded.reasonCode, "PRESENTATION_SHADER_OR_MATERIAL");
    const diagnostics = document.scenes[0].extras.chibi.renderingProfileDiagnostics;
    assert.deepEqual(diagnostics.intentionallyExcludedRenderers.map((item) => item.status), ["intentionally-excluded"]);
    assert.deepEqual(diagnostics.intentionallyExcludedRenderers.map((item) => item.hierarchyPath), ["Fixture/FX_CutinPlane"]);
    assert.equal(diagnostics.excludedChildRendererEvents.length, 1);
    assert.equal(document.scenes[0].extras.chibi.renderingProfile.childRendererEvents.length, 0);
    assert.equal(document.scenes[0].extras.chibi.renderingProfile.excludedChildRendererEvents.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('embeds exact FX exclusion proofs and matching InstantiateFx events in GLB diagnostics', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-profile-fx-exclusion-'));
  try {
    const input = path.join(root, 'input.glb'), output = path.join(root, 'output.glb'), config = path.join(root, 'config.json');
    const profile = renderingProfileWithFxExclusion();
    const proof = profile.fxExclusionProofs[0];
    proof.componentReferences.push({
      sourceReference: { ...proof.targetReference, objectId: '107' },
      type: 'MonoBehaviour',
    });
    proof.approvedMonoScriptReferences.push(structuredClone(proof.approvedMonoScriptReferences[0]));
    profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false));
    await writeFile(config, JSON.stringify({ sourceIdentity: 'fixture', exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const diagnostics = document.scenes[0].extras.chibi.renderingProfileDiagnostics;
    assert.deepEqual(diagnostics.fxExclusionProofs, profile.fxExclusionProofs);
    assert.deepEqual(diagnostics.excludedFxInstantiationEvents, profile.excludedFxInstantiationEvents);
    assert.deepEqual(document.scenes[0].extras.chibi.renderingProfile.fxExclusionProofs, profile.fxExclusionProofs);
    assert.deepEqual(document.scenes[0].extras.chibi.renderingProfile.excludedFxInstantiationEvents, profile.excludedFxInstantiationEvents);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preserves null and both intentionally enriched external particle asset PPtr states', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-profile-fx-asset-pointer-kinds-'));
  try {
    const input = path.join(root, 'input.glb'), output = path.join(root, 'output.glb'), config = path.join(root, 'config.json');
    const profile = renderingProfileWithFxExclusion();
    const asset = profile.fxExclusionProofs[0].rendererAssets[0];
    asset.meshReference = {
      pointer: { file: 'CAB-fx', pathId: '0' }, fileID: 0,
      identityResolved: true, objectResolved: false, sourceReference: null,
    };
      asset.materialReferences = [
        {
          pointer: { file: 'CAB-external-materials', pathId: '77', externalGuid: '0'.repeat(32) }, fileID: 10,
          identityResolved: true, objectResolved: false, sourceReference: null,
        },
        {
          pointer: { file: 'CAB-external-materials', pathId: '78', externalGuid: '0'.repeat(32) }, fileID: 10,
          identityResolved: true, objectResolved: true, sourceReference: null,
        },
        {
          pointer: { file: 'CAB-external-materials', pathId: '79', externalGuid: '0'.repeat(32) }, fileID: 10,
          identityResolved: true, objectResolved: false,
          sourceReference: { bundleSha256: '6'.repeat(64), serializedFile: 'CAB-external-materials', objectId: '79' },
        },
      ];
    profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false));
    await writeFile(config, JSON.stringify({ sourceIdentity: 'fixture', exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.deepEqual(document.scenes[0].extras.chibi.renderingProfileDiagnostics.fxExclusionProofs, profile.fxExclusionProofs);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preserves only the exact serialized InstantiateFx alias in FX metadata diagnostics', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-profile-fx-alias-'));
  try {
    const input = path.join(root, 'input.glb'), output = path.join(root, 'output.glb'), config = path.join(root, 'config.json');
    const profile = renderingProfileWithFxExclusion('InstantiateFx');
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false));
    await writeFile(config, JSON.stringify({ sourceIdentity: 'fixture', exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.scenes[0].extras.chibi.renderingProfile.fxExclusionProofs[0].function, 'InstantiateFx');
    assert.equal(document.scenes[0].extras.chibi.renderingProfileDiagnostics.excludedFxInstantiationEvents[0].function, 'InstantiateFx');

    const invalid = renderingProfileWithFxExclusion();
    invalid.fxExclusionProofs[0].function = 'InstantiateFxExtra';
    invalid.excludedFxInstantiationEvents[0].function = 'InstantiateFxExtra';
    invalid.validation.fxExclusionProofs = structuredClone(invalid.fxExclusionProofs);
    invalid.validation.excludedFxInstantiationEvents = structuredClone(invalid.excludedFxInstantiationEvents);
    await writeFile(config, JSON.stringify({ sourceIdentity: 'fixture', exportClips: [], renderingProfile: invalid }));
    const invalidResult = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
    assert.notEqual(invalidResult.code, 0);
    assert.match(invalidResult.stderr, /invalid source evidence or reason/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('fails closed when current FX proof/event arrays or exact source identities are malformed', async () => {
  const cases = [
    {
      label: 'missing proof array',
      mutate(profile) { delete profile.fxExclusionProofs; },
      expected: /v14 is missing proof-backed InstantiateFx exclusion records/,
    },
    {
      label: 'downgraded current rendering policy',
      mutate(profile) {
        profile.policyVersion = 'chibi-rendering-policy-v12';
        delete profile.fxExclusionProofs;
        delete profile.excludedFxInstantiationEvents;
        delete profile.validation.fxExclusionProofs;
        delete profile.validation.excludedFxInstantiationEvents;
      },
      expected: /v14 is missing proof-backed InstantiateFx exclusion records/,
    },
    {
      label: 'validation mirror mismatch',
      mutate(profile) { profile.validation.excludedFxInstantiationEvents[0].order += 1; },
      expected: /excluded FX InstantiateFx events disagree with validation records/,
    },
    {
      label: 'event without matching proof',
      mutate(profile) { profile.fxExclusionProofs = []; profile.validation.fxExclusionProofs = []; },
      expected: /not one-to-one/,
    },
    {
      label: 'unapproved script identity',
      mutate(profile) {
        profile.fxExclusionProofs[0].approvedMonoScriptReferences[0].objectId = '12345';
        profile.validation.fxExclusionProofs[0].approvedMonoScriptReferences[0].objectId = '12345';
      },
      expected: /unapproved MonoScript source identity/,
    },
    {
      label: 'missing renderer mesh PPtr evidence',
      mutate(profile) {
        profile.fxExclusionProofs[0].rendererAssets[0].meshReference = null;
        profile.validation.fxExclusionProofs[0].rendererAssets[0].meshReference = null;
      },
      expected: /malformed or unresolved particle renderer PPtr evidence/,
    },
    {
      label: 'non-decimal renderer PPtr path ID',
      mutate(profile) {
        profile.fxExclusionProofs[0].rendererAssets[0].meshReference = {
          pointer: { file: 'CAB-external', pathId: 'not-a-path-id' }, fileID: 10,
          identityResolved: true, objectResolved: false, sourceReference: null,
        };
        profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
      },
      expected: /malformed or unresolved particle renderer PPtr evidence/,
    },
    {
      label: 'unresolved local non-null renderer PPtr',
      mutate(profile) {
        profile.fxExclusionProofs[0].rendererAssets[0].meshReference = {
          pointer: { file: 'CAB-fx', pathId: '107' }, fileID: 0,
          identityResolved: true, objectResolved: false, sourceReference: null,
        };
        profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
      },
      expected: /unresolved particle renderer PPtr evidence/,
    },
    {
      label: 'null pointer marked as a resolved object',
      mutate(profile) {
        profile.fxExclusionProofs[0].rendererAssets[0].meshReference = {
          pointer: { file: 'CAB-fx', pathId: '0' }, fileID: 0,
          identityResolved: true, objectResolved: true, sourceReference: null,
        };
        profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
      },
      expected: /unresolved particle renderer PPtr evidence/,
    },
    {
      label: 'null pointer with contradictory source reference',
      mutate(profile) {
        profile.fxExclusionProofs[0].rendererAssets[0].meshReference = {
          pointer: { file: 'CAB-fx', pathId: '0' }, fileID: 0,
          identityResolved: true, objectResolved: false,
          sourceReference: { bundleSha256: '2'.repeat(64), serializedFile: 'CAB-fx', objectId: '106' },
        };
        profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
      },
      expected: /source reference disagrees with its serialized PPtr/,
    },
    {
      label: 'identity-unresolved renderer PPtr',
      mutate(profile) {
        profile.fxExclusionProofs[0].rendererAssets[0].meshReference.identityResolved = false;
        profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
      },
      expected: /malformed or unresolved particle renderer PPtr evidence/,
    },
    {
      label: 'renderer source pointer disagreement',
      mutate(profile) {
        profile.fxExclusionProofs[0].rendererAssets[0].meshReference.pointer.pathId = '107';
        profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
      },
      expected: /source reference disagrees with its serialized PPtr/,
    },
    {
      label: 'malformed external GUID',
      mutate(profile) {
        profile.fxExclusionProofs[0].rendererAssets[0].meshReference = {
          pointer: { file: 'CAB-external', pathId: '107', externalGuid: 'not-a-guid' }, fileID: 10,
          identityResolved: true, objectResolved: false, sourceReference: null,
        };
        profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
      },
      expected: /malformed or unresolved particle renderer PPtr evidence/,
    },
    {
      label: 'required core asset pointer overlap',
      mutate(profile) {
        const coreMesh = profile.renderers[0].sourceMesh;
        profile.fxExclusionProofs[0].rendererAssets[0].meshReference = {
          pointer: { file: coreMesh.file, pathId: coreMesh.pathId }, fileID: 0,
          identityResolved: true, objectResolved: true, sourceReference: structuredClone(coreMesh.sourceReference),
        };
        profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
      },
      expected: /overlaps required core source content/,
    },
  ];
  for (const pathId of ['00', '-0', '01', '-01']) {
    cases.push({
      label: `non-canonical renderer PPtr path ID ${pathId}`,
      mutate(profile) {
        profile.fxExclusionProofs[0].rendererAssets[0].meshReference = {
          pointer: { file: 'CAB-external', pathId }, fileID: 10,
          identityResolved: true, objectResolved: false, sourceReference: null,
        };
        profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs);
      },
      expected: /malformed or unresolved particle renderer PPtr evidence/,
    });
  }
  for (const fixture of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-fx-exclusion-${fixture.label.replaceAll(' ', '-')}-`));
    try {
      const input = path.join(root, 'input.glb'), output = path.join(root, 'output.glb'), config = path.join(root, 'config.json');
      const profile = renderingProfileWithFxExclusion();
      fixture.mutate(profile);
      await writeFile(input, glbWithProfileRenderer(undefined, false, false, false));
      await writeFile(config, JSON.stringify({ sourceIdentity: 'fixture', exportClips: [], renderingProfile: profile }));
      const result = await runPostprocess(path.resolve('scripts/chibi-postprocess.mjs'), input, output, config);
      assert.notEqual(result.code, 0, fixture.label);
      assert.match(result.stderr, fixture.expected, fixture.label);
      assert.equal(await access(output).then(() => true, () => false), false, fixture.label);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("accepts exact material, shader, and mesh claims for audited presentation-shaped renderers", async () => {
  const cases = [
    {
      label: "Tsurugi",
      rendererName: "Quad",
      materialName: "FX_MAT_Aura_07",
      shaderName: "DSFX/FX_SHADER_AlphaBlend_Add_Distort_0",
      builtinQuad: false,
    },
    {
      label: "Ui",
      rendererName: "BG_White (1)",
      materialName: "FX_MAT_4PXWhite_1_add",
      shaderName: "DSFX/FX_SHADER_Additive_0",
      builtinQuad: true,
    },
    {
      label: "Meru",
      rendererName: "FX_CH0124_Cam_Screen",
      materialName: "FX_MAT_4PXWhite_1_add",
      shaderName: "DSFX/FX_SHADER_Additive_0",
      builtinQuad: true,
    },
  ];
  for (const fixture of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-${fixture.label.toLowerCase()}-evidence-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const profile = auditedPresentationExclusionProfile(fixture);
      await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true, fixture.rendererName));
      await writeFile(config, JSON.stringify({ sourceIdentity: fixture.label.toLowerCase(), exportClips: [], renderingProfile: profile }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.equal(result.code, 0, `${fixture.label}: ${result.stderr}`);
      const document = readGlbJson(await readFile(output));
      assert.equal(document.nodes[3].mesh, undefined, `${fixture.label} presentation mesh should be omitted`);
      assert.equal(document.nodes[3].extras.chibi.presentationOnlyExcluded.reasonCode,
        fixture.reasonCode ?? (fixture.builtinQuad ? "PRESENTATION_MESH_10210_OR_HELPER" : "PRESENTATION_SHADER_OR_MATERIAL"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("keeps Hoshino and Miyako attachment-shaped renderers core despite presentation evidence", async () => {
  const cases = [
    { label: "Hoshino", rendererName: "Logo (1)", materialName: "FX_MAT_Hoshino_Logo_01", shaderName: "DSFX/FX_SHADER_Additive_0", builtinQuad: true },
    { label: "Miyako", rendererName: "Light", materialName: "FX_MAT_Squre_02d", shaderName: "DSFX/FX_SHADER_AlphaBlend_Add", builtinQuad: true },
  ];
  for (const fixture of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-${fixture.label.toLowerCase()}-attachment-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const profile = auditedPresentationExclusionProfile(fixture);
      profile.assembly.attachments = { equipmentRendererReferences: [profile.excludedRenderers[0].sourceReference] };
      await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true, fixture.rendererName));
      await writeFile(config, JSON.stringify({ sourceIdentity: fixture.label.toLowerCase(), exportClips: [], renderingProfile: profile }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0, `${fixture.label} attachment must not be excluded`);
      assert.match(result.stderr, /may omit required character or equipment content/);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("fails closed for tampered presentation material, shader, and mesh source identities", async () => {
  const cases = [
    {
      label: "material",
      mutate: (profile) => {
        profile.excludedRenderers[0].materials[0].sourceReference = {
          ...profile.excludedRenderers[0].materials[0].sourceReference, objectId: "9007199254741201",
        };
      },
      expected: /does not match its source assembly material slot/,
    },
    {
      label: "shader",
      mutate: (profile) => {
        profile.excludedRenderers[0].materials[0].shaderReference = {
          ...profile.excludedRenderers[0].materials[0].shaderReference, objectId: "9007199254741202",
        };
      },
      expected: /unknown or mixed source evidence: exact source shader reference/,
    },
    {
      label: "mesh",
      mutate: (profile) => {
        profile.excludedRenderers[0].sourceMesh.sourceReference = {
          ...profile.excludedRenderers[0].sourceMesh.sourceReference, objectId: "9007199254741203",
        };
      },
      expected: /source mesh identity does not match its source assembly renderer/,
    },
  ];
  for (const fixture of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-tampered-${fixture.label}-evidence-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const profile = renderingProfileWithPresentationExclusion();
      fixture.mutate(profile);
      await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true));
      await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, fixture.expected);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("fails closed when a presentation exclusion source identity is tampered", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-presentation-tamper-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfileWithPresentationExclusion();
    profile.excludedRenderers[0].sourceReference = { ...profile.excludedRenderers[0].sourceReference, objectId: "9007199254741099" };
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /does not match exactly one source assembly renderer/);
    assert.equal(await access(output).then(() => true, () => false), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("uses exact equipment references instead of same-name attachment hints", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-equipment-name-only-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfileWithPresentationExclusion();
    profile.assembly.attachments = {
      equipmentRenderers: [profile.excludedRenderers[0].name],
      // This is a different source renderer with the same exported name. A
      // name-only attachment must not protect or claim the exclusion.
      equipmentRendererReferences: [profile.renderers[0].sourceReference],
    };
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.nodes[3].mesh, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("preserves structural equipment binding evidence and diagnostics", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-structural-equipment-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfileWithStructuralEquipmentEvidence();
    await writeFile(input, glbWithMouthOnlyAndSeparateEyeRenderers());
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const embeddedProfile = document.scenes[0].extras.chibi.renderingProfile;
    const diagnostics = document.scenes[0].extras.chibi.renderingProfileDiagnostics;
    assert.equal(embeddedProfile.equipmentBindingEvidence[0].classification, "structurally-bound-equipment");
    assert.deepEqual(embeddedProfile.validation.equipmentBindingEvidence, embeddedProfile.equipmentBindingEvidence);
    assert.deepEqual(diagnostics.equipmentBindingEvidence, embeddedProfile.equipmentBindingEvidence);
    assert.deepEqual(diagnostics.coreRendererBlockers, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("embeds exact source weapon ancestry provenance in the GLB", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-exact-source-weapon-ancestry-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfileWithExactSourceWeaponAncestryEvidence();
    await writeFile(input, glbWithMouthOnlyAndSeparateEyeRenderers());
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const chibi = document.scenes[0].extras.chibi;
    const embeddedEvidence = chibi.renderingProfile.equipmentBindingEvidence[0];
    assert.equal(embeddedEvidence.reasonCode, "EXACT_SOURCE_WEAPON_ANCESTRY");
    assert.deepEqual(embeddedEvidence.rootBoneAncestry.map((pointer) => pointer.sourceReference.objectId), ["202"]);
    assert.deepEqual(embeddedEvidence.matchedAncestorPointers.map((pointer) => pointer.name), ["Bip001_Weapon"]);
    assert.deepEqual(chibi.renderingProfileDiagnostics.equipmentBindingEvidence[0].rootBoneAncestry, embeddedEvidence.rootBoneAncestry);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts an exact weapon ancestor that exists only in rootBoneAncestry and rejects a fake matched ancestor", async () => {
  const cases = [
    { label: "ancestor-only", mutate: null, expectedCode: 0 },
    {
      label: "fake-matched-ancestor",
      mutate: (profile) => {
        profile.equipmentBindingEvidence[0].matchedAncestorPointers = [{
          file: "CAB-fixture",
          pathId: "999",
          name: "Bip001_Weapon",
        }];
      },
      expectedCode: 1,
    },
  ];
  for (const fixture of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-exact-source-weapon-ancestor-only-${fixture.label}-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const profile = renderingProfileWithExactSourceWeaponAncestryEvidence({ ancestorOnlyInRootBoneAncestry: true });
      fixture.mutate?.(profile);
      profile.validation.equipmentBindingEvidence = structuredClone(profile.equipmentBindingEvidence);
      await writeFile(input, glbWithMouthOnlyAndSeparateEyeRenderers());
      await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      if (fixture.expectedCode === 0) {
        assert.equal(result.code, 0, result.stderr);
        const embedded = readGlbJson(await readFile(output)).scenes[0].extras.chibi.renderingProfile;
        assert.deepEqual(embedded.equipmentBindingEvidence[0].matchedAncestorPointers.map((pointer) => pointer.name), ["Bip001_Weapon"]);
      } else {
        assert.notEqual(result.code, 0, fixture.label);
        assert.match(result.stderr, /invalid matched ancestor/);
        assert.equal(await access(output).then(() => true, () => false), false, fixture.label);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("fails closed for missing, cross-prefab, duplicate, and mismatched exact source weapon ancestry evidence", async () => {
  const cases = [
    {
      label: "missing",
      mutate: (profile) => {
        profile.equipmentBindingEvidence[0].rootBoneAncestry = [];
      },
      expected: /incomplete rootBone ancestry/,
    },
    {
      label: "cross-prefab",
      mutate: (profile) => {
        profile.equipmentBindingEvidence[0].rootBoneAncestry[0] = {
          file: "CAB-other-prefab",
          pathId: "202",
          name: "Bip001_Weapon",
          sourceReference: {
            bundleSha256: "f".repeat(64),
            serializedFile: "CAB-other-prefab",
            objectId: "202",
          },
        };
      },
      expected: /crosses the selected source prefab|selected assembly rootBone ancestry/,
    },
    {
      label: "duplicate",
      mutate: (profile) => {
        profile.assembly.attachments.subWeapon = [structuredClone(profile.assembly.attachments.mainWeapon[0])];
      },
      expected: /duplicate authored mainWeapon\/subWeapon pointers|exactly one authored mainWeapon\/subWeapon ancestor/,
    },
    {
      label: "claim-mismatch",
      mutate: (profile) => {
        profile.equipmentBindingEvidence[0].evidence = profile.equipmentBindingEvidence[0].evidence
          .map((claim) => claim === "body m_Bones overlap: none or non-conflicting; exact source weapon ancestry remains unique"
            ? "body m_Bones overlap: none; source hierarchy independently corroborates movement"
            : claim);
      },
      expected: /missing its exact source claims/,
    },
  ];
  for (const fixture of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-exact-source-weapon-${fixture.label}-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const profile = renderingProfileWithExactSourceWeaponAncestryEvidence();
      fixture.mutate(profile);
      profile.validation.equipmentBindingEvidence = structuredClone(profile.equipmentBindingEvidence);
      await writeFile(input, glbWithMouthOnlyAndSeparateEyeRenderers());
      await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0, fixture.label);
      assert.match(result.stderr, fixture.expected, fixture.label);
      assert.equal(await access(output).then(() => true, () => false), false, fixture.label);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("preserves a zero-body-overlap shared equipment m_Bones relation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-shared-equipment-bones-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfileWithStructuralEquipmentEvidence();
    const evidence = profile.equipmentBindingEvidence[0];
    evidence.bodyRendererReferences = [];
    evidence.evidence.push("body m_Bones overlap: none; exact authored equipment m_Bones relation independently corroborates movement");
    evidence.evidence.push("unique non-conflicting same-prefab shared m_Bones relation");
    profile.validation.equipmentBindingEvidence = structuredClone(profile.equipmentBindingEvidence);
    await writeFile(input, glbWithMouthOnlyAndSeparateEyeRenderers());
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const embeddedProfile = readGlbJson(await readFile(output)).scenes[0].extras.chibi.renderingProfile;
    assert.deepEqual(embeddedProfile.equipmentBindingEvidence[0].bodyRendererReferences, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a zero-body-overlap claim without the exact shared m_Bones relation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-shared-equipment-bones-tamper-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfileWithStructuralEquipmentEvidence();
    const evidence = profile.equipmentBindingEvidence[0];
    evidence.bodyRendererReferences = [];
    evidence.evidence.push("body m_Bones overlap: none; exact authored equipment m_Bones relation independently corroborates movement");
    profile.validation.equipmentBindingEvidence = structuredClone(profile.equipmentBindingEvidence);
    await writeFile(input, glbWithMouthOnlyAndSeparateEyeRenderers());
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /invalid body-renderer relation/);
    assert.equal(await access(output).then(() => true, () => false), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails closed when structural equipment transform evidence is tampered", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-structural-equipment-tamper-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfileWithStructuralEquipmentEvidence();
    profile.equipmentBindingEvidence[0].transformChain[1].pathId = "999";
    profile.validation.equipmentBindingEvidence = structuredClone(profile.equipmentBindingEvidence);
    await writeFile(input, glbWithMouthOnlyAndSeparateEyeRenderers());
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /structural equipment evidence .*transform\/bone identities/);
    assert.equal(await access(output).then(() => true, () => false), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps the exact shield or smartphone equipment renderer core", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-equipment-exact-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfileWithPresentationExclusion();
    profile.assembly.attachments = {
      equipmentRendererReferences: [profile.excludedRenderers[0].sourceReference],
    };
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /may omit required character or equipment content/);
    assert.equal(await access(output).then(() => true, () => false), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects mixed presentation and core material provenance", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-mixed-material-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfileWithPresentationExclusion();
    const exclusion = profile.excludedRenderers[0];
    const coreSlot = profile.renderers[0].materialSlots[0];
    exclusion.materials[0] = {
      name: "Fixture_EyeMouth",
      sourceReference: coreSlot.sourceMaterialReference,
      shaderName: coreSlot.sourceShaderParsedName,
      shaderReference: coreSlot.sourceShaderReference,
    };
    profile.assembly.renderers[0].materialSlots[0].sourceMaterialReference = coreSlot.sourceMaterialReference;
    exclusion.evidence = [
      `exact source renderer reference ${exclusion.sourceReference.bundleSha256}:${exclusion.sourceReference.serializedFile.toLowerCase()}:${exclusion.sourceReference.objectId}`,
      `source hierarchy ${exclusion.hierarchyPath}`,
      "source renderer is in an FX/camera/cutin/presentation branch",
      "source material is explicitly effect-scoped: Fixture_EyeMouth",
      `source shader is an effect family: ${coreSlot.sourceShaderParsedName}`,
    ];
    profile.validation.excludedRenderers = [exclusion];
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /shares a source material identity with core character content/);
    assert.equal(await access(output).then(() => true, () => false), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validates and diagnoses an explicit inert presentation helper exclusion", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-inert-helper-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfile({ mouth: false });
    const sourceReference = { ...profile.renderers[0].sourceReference, objectId: "9007199254741015" };
    const exclusion = {
      sourceReference,
      name: "FX_CutinPlane",
      hierarchyPath: "Fixture/FX_CutinPlane",
      reasonCode: "PRESENTATION_MESH_10210_OR_HELPER",
      evidence: [
        `exact source renderer reference ${sourceReference.bundleSha256}:${sourceReference.serializedFile.toLowerCase()}:${sourceReference.objectId}`,
        "source hierarchy Fixture/FX_CutinPlane",
        "source renderer is an explicitly inert helper",
      ],
      sourceMesh: null,
      materials: [],
    };
    profile.assembly = {
      root: "Fixture",
      rendererOrder: [exclusion.name],
      renderers: [{ name: exclusion.name, pathId: "78", sourceReference, hierarchyPath: exclusion.hierarchyPath, enabled: true, visible: true, rendererType: "MeshRenderer", mesh: null, materialSlots: [] }],
      attachments: {},
    };
    profile.excludedRenderers = [exclusion];
    profile.validation = { ...profile.validation, excludedRenderers: [exclusion] };
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const diagnostics = document.scenes[0].extras.chibi.renderingProfileDiagnostics;
    assert.equal(diagnostics.intentionallyExcludedRenderers[0].status, "intentionally-excluded");
    assert.equal(diagnostics.intentionallyExcludedRenderers[0].reasonCode, "PRESENTATION_MESH_10210_OR_HELPER");
    assert.equal(document.nodes[3].mesh, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts an exact inert null-pointer helper without material or shader identities", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-inert-null-pointer-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = inertNullPointerPresentationProfile();
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true, "Box001"));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const diagnostics = document.scenes[0].extras.chibi.renderingProfileDiagnostics;
    assert.equal(diagnostics.intentionallyExcludedRenderers[0].status, "intentionally-excluded");
    assert.equal(diagnostics.intentionallyExcludedRenderers[0].reasonCode, "PRESENTATION_MESH_10210_OR_HELPER");
    assert.equal(document.nodes[3].mesh, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails closed for inert null-pointer helper mismatches, core overlap, and provenance tampering", async () => {
  const cases = [
    {
      label: "non-null mesh pointer",
      mutate: (profile) => { profile.excludedRenderers[0].sourceMesh.pathId = "1"; },
      expected: /source mesh pointer does not match its source assembly renderer/,
    },
    {
      label: "non-null material pointer",
      mutate: (profile) => { profile.assembly.renderers[0].materialSlots[0].material.pathId = "1"; },
      expected: /missing exact source material and shader identities/,
    },
    {
      label: "core renderer overlap",
      mutate: (profile) => {
        profile.renderers.push({ ...structuredClone(profile.renderers[0]), sourceReference: structuredClone(profile.excludedRenderers[0].sourceReference) });
      },
      expected: /both core and presentation-excluded/,
    },
    {
      label: "wrong exclusion reason",
      mutate: (profile) => { profile.excludedRenderers[0].reasonCode = "PRESENTATION_SHADER_OR_MATERIAL"; },
      expected: /missing exact source material and shader identities/,
    },
    {
      label: "wrong null-pointer evidence",
      mutate: (profile) => {
        profile.excludedRenderers[0].evidence = profile.excludedRenderers[0].evidence.filter((claim) => !claim.startsWith("source mesh is the exact null pointer"));
      },
      expected: /missing exact inert null-pointer source evidence/,
    },
  ];
  for (const fixture of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-inert-null-${fixture.label.replaceAll(" ", "-")}-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const profile = inertNullPointerPresentationProfile();
      fixture.mutate(profile);
      await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true, "Box001"));
      await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0, `${fixture.label} should fail closed`);
      assert.match(result.stderr, fixture.expected, fixture.label);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("rejects unknown evidence on a presentation exclusion", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-unknown-exclusion-evidence-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = renderingProfileWithPresentationExclusion();
    profile.excludedRenderers[0].evidence.push("shield mesh is core equipment");
    profile.validation.excludedRenderers = [profile.excludedRenderers[0]];
    await writeFile(input, glbWithProfileRenderer(undefined, false, false, false, true));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /unknown or mixed source evidence/);
    assert.equal(await access(output).then(() => true, () => false), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("preserves eyes on an exact sibling EyeMouth slot when the mouth slot has only mouth triangles", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-mouth-only-slot-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), atlas = path.join(root, "mouth.png");
    await writeFile(input, glbWithMouthOnlyAndSeparateEyeRenderers());
    await writeFile(atlas, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: renderingProfileWithSeparateEyeRenderer(), mouthTexturePath: atlas,
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const profile = document.scenes[0].extras.chibi.renderingProfile;
    const [body, face] = profile.renderers;
    const mouthMaterialIndex = profile.mouth.glbMaterialIndex;
    assert.deepEqual(profile.mouth.glbPrimitiveIndices, { eyes: [], mouth: [0] });
    assert.deepEqual(body.materialSlots[0].glb.primitiveIndices, [0]);
    assert.deepEqual(body.materialSlots[0].glb.materialIndices, [mouthMaterialIndex]);
    assert.deepEqual(face.materialSlots[0].glb.primitiveIndices, [0]);
    assert.deepEqual(face.materialSlots[0].glb.materialIndices, [1]);
    assert.equal(document.meshes[0].primitives[0].material, mouthMaterialIndex);
    assert.equal(document.meshes[1].primitives[0].material, 1);
    assert.equal(document.materials[1].extras.chibi.renderOrder, 10001);
    assert.equal(document.materials[mouthMaterialIndex].extras.chibi.mouthProfileBinding.materialSlot, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("removes ignored vertex colors from every source-bound EyeMouth slot", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-eye-colors-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), atlas = path.join(root, "mouth.png");
    await writeFile(input, glbWithProfileRenderer(undefined, false, true));
    await writeFile(atlas, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: renderingProfile({ extraEyeMouthSlot: true }), mouthTexturePath: atlas,
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.meshes[0].primitives.length, 3);
    assert.equal(document.meshes[0].primitives.every((primitive) => primitive.attributes.COLOR_0 === undefined), true);
    assert.equal(document.scenes[0].extras.chibi.renderingProfile.renderers[0].materialSlots.length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts a null source MainTex pointer without requiring a GLB texture", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-null-maintex-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    await writeFile(input, glbWithProfileRenderer());
    const profile = renderingProfile({ mouth: false });
    const slot = profile.renderers[0].materialSlots[0];
    slot.adapterId = "mx-character-general";
    slot.adapterSettings.baseColorTint = [1, 1, 1, 1];
    slot.materialProperties.textures = [{
      name: "_MainTex", texture: { file: "CAB-materials", pathId: "0" }, textureReference: null,
      scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
    }];
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.equal(document.materials[0].pbrMetallicRoughness?.baseColorTexture, undefined);
    assert.equal(document.scenes[0].extras.chibi.renderingProfile.renderers[0].materialSlots[0].glb.materialIndices.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a verified custom shader adapter until its Viewer runtime exists", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-custom-adapter-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    await writeFile(input, glbWithProfileRenderer());
    const profile = renderingProfile({ mouth: false });
    const slot = profile.renderers[0].materialSlots[0];
    slot.adapterId = "mx-e-water-v2";
    slot.sourceShaderName = "MX/E-Water-V2";
    slot.sourceShaderParsedName = "MX/E-Water-V2";
    slot.shaderProgramBlobSha256 = "97f1c0143e2fc4451b6892f2d0de121fd9abdd5c80728ba22c2e2427d0470748";
    slot.sourceShaderReference = {
      bundleSha256: "27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85",
      serializedFile: "CAB-38d7f184c16228480d78cd7ea10cae27", objectId: "-1189838917732900529",
    };
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /requires a Viewer runtime adapter for ripple\/distortion behavior/);
    assert.equal(await access(output).then(() => true, () => false), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts the source MX/C-Transparent-ST NORMAL declaration in a profile pass", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-transparent-normal-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const mainTexture = path.join(root, "main.png"), maskTexture = path.join(root, "mask.png");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
    await writeFile(input, glbWithProfileRenderer());
    await writeFile(mainTexture, png);
    await writeFile(maskTexture, png);
    const { profile, mainReference, maskReference } = transparentProfile();
    const slot = profile.renderers[0].materialSlots[0];
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
      sourceTextureExports: [
        { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_MainTex", textureReference: mainReference, path: mainTexture },
        { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_MaskTex", textureReference: maskReference, path: maskTexture },
      ],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const metadata = document.materials[0].extras.chibi;
    assert.equal(metadata.adapterId, "mx-c-transparent-st");
    assert.equal(metadata.transparentShaderExtraction.passes.forward.glsl.includes("in mediump vec3 in_NORMAL0;"), true);
    assert.equal(metadata.maskTexture.index >= 0, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const [label, normalDeclaration] of [["absent", ""], ["wrong semantic", "in mediump vec3 in_NORMAL;"]]) {
  test(`rejects an MX/C-Transparent-ST pass with ${label} NORMAL input`, async () => {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-transparent-normal-reject-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const mainTexture = path.join(root, "main.png"), maskTexture = path.join(root, "mask.png");
      const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(mainTexture, png);
      await writeFile(maskTexture, png);
      const { profile, mainReference, maskReference } = transparentProfile({ normalDeclaration });
      const slot = profile.renderers[0].materialSlots[0];
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [
          { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_MainTex", textureReference: mainReference, path: mainTexture },
          { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_MaskTex", textureReference: maskReference, path: maskTexture },
        ],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /Forward pass GLSL is missing required NORMAL input semantics/);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("restores a dropped profile MainTex from its exact material and texture identities", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-maintex-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "body.png");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
    await writeFile(input, glbWithProfileRenderer());
    await writeFile(texture, png);
    const profile = renderingProfile({ mouth: false });
    const slot = profile.renderers[0].materialSlots[0];
    const textureReference = { bundleSha256: "d".repeat(64), serializedFile: "CAB-textures", objectId: "9007199254741001" };
    slot.adapterId = "mx-character-general";
    slot.adapterSettings.baseColorTint = [1, 1, 1, 1];
    slot.materialProperties.textures = [{
      name: "_MainTex", texture: { file: "CAB-textures", pathId: textureReference.objectId }, textureReference,
      scale: { x: 0.75, y: 0.5 }, offset: { x: 0.1, y: 0.25 },
    }];
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
      sourceMainTextureExports: [{ sourceMaterialReference: slot.sourceMaterialReference, textureReference, path: texture }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const outputBytes = await readFile(output);
    const document = readGlbJson(outputBytes);
    const material = document.materials[0];
    const image = document.images[document.textures[material.pbrMetallicRoughness.baseColorTexture.index].source];
    const view = document.bufferViews[image.bufferView];
    assert.equal(image.mimeType, "image/png");
    assert.deepEqual(readGlbBinary(outputBytes).subarray(view.byteOffset, view.byteOffset + view.byteLength), png);
    assert.deepEqual(material.pbrMetallicRoughness.baseColorTexture.extensions.KHR_texture_transform, {
      offset: [0.1, 0.25], scale: [0.75, 0.5],
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("binds exact static DSFX textures, tint, unlit metadata, and source blend state", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
  for (const ruleIndex of [0, 1, 2]) {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-static-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(texture, png);
      const { profile, textureReference } = staticDsfxProfile(ruleIndex);
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [{ sourceMaterialReference: profile.renderers[0].materialSlots[0].sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.equal(result.code, 0, result.stderr);
      const outputBytes = await readFile(output);
      const document = readGlbJson(outputBytes);
      const material = document.materials[0];
      const sourceImage = document.images[document.textures[material.pbrMetallicRoughness.baseColorTexture.index].source];
      const view = document.bufferViews[sourceImage.bufferView];
      const rule = staticDsfxRules[ruleIndex];
      assert.deepEqual(readGlbBinary(outputBytes).subarray(view.byteOffset, view.byteOffset + view.byteLength), png);
      assert.deepEqual(material.pbrMetallicRoughness.baseColorFactor, [0.25, 0.5, 0.75, 0.8]);
      assert.deepEqual(material.extensions.KHR_materials_unlit, {});
      assert.equal(document.extensionsUsed.includes("KHR_materials_unlit"), true);
      assert.deepEqual(material.pbrMetallicRoughness.baseColorTexture.extensions.KHR_texture_transform, {
        offset: [0.1, 0.25], scale: [0.75, 0.5],
      });
      assert.deepEqual(material.extras.chibi.blend, {
        source: rule.source, destination: rule.destination, sourceAlpha: rule.source, destinationAlpha: rule.destination, operation: 0, operationAlpha: 0,
      });
      assert.equal(material.extras.chibi.textureProperty, "_Texture");
      assert.equal(material.extras.chibi.adapterId, "dsfx-static");
      assert.equal(material.extras.chibi.unlit, true);
      if (ruleIndex === 0) {
        assert.equal(material.extras.chibi.dsfxShaderExtraction.fingerprint, "e4f30af59274e0b917915212c19c6c7e8c47f2da605d04a0eb6649c5d0ff1cfc");
        assert.deepEqual(material.extras.chibi.dsfxMaterialProperties.colors._Color, { r: 0.25, g: 0.5, b: 0.75, a: 0.8 });
        assert.equal(typeof material.extras.chibi.dsfxTextures.texture.index, "number");
        assert.equal(material.extras.chibi.depthWrite, false);
        assert.equal(material.extras.chibi.depthTest, false);
        assert.equal(material.extras.chibi.depthFunction, "disabled");
        assert.equal(material.extras.chibi.cullMode, "off");
        assert.equal(material.extras.chibi.sourceQueue, 3000);
      }
      if (ruleIndex === 1) {
        assert.equal(material.extras.chibi.dsfxShaderExtraction.fingerprint, "bdf731975748307a798ac9b06c9d2bbb0078ac1a80d02c5d790de6e85c8aceb8");
        assert.deepEqual(material.extras.chibi.dsfxMaterialProperties.colors._Color, { r: 0.25, g: 0.5, b: 0.75, a: 0.8 });
        assert.equal(typeof material.extras.chibi.dsfxTextures.texture.index, "number");
        assert.equal(material.extras.chibi.dsfxRenderStateVariant, "static-default");
        assert.equal(material.extras.chibi.depthWrite, false);
        assert.equal(material.extras.chibi.depthTest, false);
        assert.equal(material.extras.chibi.depthFunction, "disabled");
        assert.equal(material.extras.chibi.cullMode, "off");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("binds exact AlphaBlend_Add extraction and rejects targeted source/material tampering", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-alpha-add-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
    await writeFile(input, glbWithProfileRenderer());
    await writeFile(texture, png);
    const { profile, textureReference } = staticDsfxProfile(1);
    const slot = profile.renderers[0].materialSlots[0];
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
      sourceTextureExports: [{ sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const material = readGlbJson(await readFile(output)).materials[0];
    assert.equal(material.alphaMode, "BLEND");
    assert.equal(material.doubleSided, true);
    assert.deepEqual(material.pbrMetallicRoughness.baseColorFactor, [0.25, 0.5, 0.75, 0.8]);
    assert.deepEqual(material.extensions.KHR_materials_unlit, {});
    assert.equal(material.extras.chibi.dsfxShaderExtraction.gles3Programs.length, 4);
    assert.equal(material.extras.chibi.dsfxShaderExtraction.shader.keywordNames.includes("INSTANCING_ON"), true);
    assert.equal(material.extras.chibi.dsfxMaterialProperties.floats._Multiply, 1);
    assert.equal(material.extras.chibi.dsfxRenderStateVariant, "static-default");
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  const tamperCases = [
    { label: "missing extraction", mutate: (slot) => { delete slot.dsfxShaderExtraction; }, pattern: /complete source extraction/ },
    { label: "program hash", mutate: (slot) => { slot.dsfxShaderExtraction.gles3Programs[0].programHash = "0".repeat(64); }, pattern: /incomplete GLES3 program/ },
    { label: "binding parameter", mutate: (slot) => { slot.dsfxShaderExtraction.bindings[0].parameterRecordSha256 = "0".repeat(64); }, pattern: /AlphaBlend_Add binding metadata/ },
    { label: "forward uniform", mutate: (slot) => { slot.dsfxShaderExtraction.gles3Programs[0].glsl = slot.dsfxShaderExtraction.gles3Programs[0].glsl.replace("_Multiply", "_NotMultiply"); }, pattern: /incomplete AlphaBlend_Add GLSL/ },
    { label: "multiply", mutate: (slot) => { slot.materialProperties.floats._Multiply = 2; }, pattern: /unverified _Multiply/ },
    { label: "texture pointer", mutate: (slot) => { slot.materialProperties.textures[0].textureReference.objectId = "999"; }, pattern: /mismatched _Texture pointer/ },
    { label: "render variant", mutate: (slot) => { slot.dsfxRenderStateVariant = "depth-tested-back-cull"; }, pattern: /unverified render state/ },
  ];
  for (const testCase of tamperCases) {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-alpha-add-tamper-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(texture, png);
      const { profile, textureReference } = staticDsfxProfile(1);
      const slot = profile.renderers[0].materialSlots[0];
      testCase.mutate(slot);
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [{ sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0, testCase.label);
      assert.match(result.stderr, testCase.pattern, testCase.label);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("binds Wakamo eyes to the exact Unity white _Texture default and rejects source/gate tampering", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-wakamo-white-eye-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const profile = wakamoEyeDsfxProfile();
    await writeFile(input, glbWithProfileRenderer());
    await writeFile(config, JSON.stringify({ sourceIdentity: "wakamo_original", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const outputBytes = await readFile(output);
    const document = readGlbJson(outputBytes);
    const metadata = document.materials[0].extras.chibi;
    assert.equal(metadata.dsfxMaterialVariant, "wakamo-eye-white-default");
    assert.deepEqual(metadata.dsfxTextures.texture, { default: "unity-white" });
    assert.equal(document.materials[0].pbrMetallicRoughness.baseColorTexture, undefined);
    assert.deepEqual(metadata.sourceMaterialReference, profile.renderers[0].materialSlots[0].sourceMaterialReference);
    assert.deepEqual(metadata.dsfxMaterialProperties.textures[0], profile.renderers[0].materialSlots[0].materialProperties.textures[0]);
    // glbWithProfileRenderer() is intentionally only a minimal mapping fixture
    // (it omits POSITION), so engine geometry validation is covered by its
    // separate valid-mesh tests rather than this metadata/postprocess test.
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  const tamperCases = [
    { label: "material reference", mutate: slot => { slot.sourceMaterialReference.objectId = "1142847250617954325"; }, pattern: /not bound to the exact Wakamo eye source material/ },
    { label: "missing variant marker", mutate: slot => { delete slot.dsfxMaterialVariant; }, pattern: /not bound to the exact Wakamo eye source material/ },
    { label: "custom offset gate", mutate: slot => { slot.materialProperties.floats._Custom_Data_Offset_Use = 0; }, pattern: /unverified material scalar state/ },
    { label: "main texture gate", mutate: slot => { slot.materialProperties.floats._Main_Texture_No = 0; }, pattern: /unverified material scalar state/ },
    { label: "source render queue", mutate: slot => { slot.renderState.sourceQueue = 3000; }, pattern: /unverified render state/ },
    { label: "null texture pointer", mutate: slot => { slot.materialProperties.textures[0].texture.pathId = "1"; }, pattern: /tampered null _Texture pointer/ },
    { label: "texture transform", mutate: slot => { slot.materialProperties.textures[0].scale.x = 2; }, pattern: /tampered null _Texture pointer/ },
    { label: "shader consumes inert Standard field", mutate: slot => {
      const program = slot.dsfxShaderExtraction.gles3Programs[1];
      program.glsl = program.glsl.slice(0, -"_GlossyReflections".length) + "_GlossyReflections";
    }, pattern: /Wakamo inert property/ },
  ];
  for (const testCase of tamperCases) {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-wakamo-white-eye-tamper-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const profile = wakamoEyeDsfxProfile();
      testCase.mutate(profile.renderers[0].materialSlots[0]);
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(config, JSON.stringify({ sourceIdentity: "wakamo_original", exportClips: [], renderingProfile: profile }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0, testCase.label);
      assert.match(result.stderr, testCase.pattern, testCase.label);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("fails closed for tampered or inert Additive_0 source evidence", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
  const tamperCases = [
    { label: "missing extraction", mutate: (slot) => { delete slot.dsfxShaderExtraction; }, pattern: /complete source extraction/ },
    { label: "fingerprint", mutate: (slot) => { slot.dsfxShaderExtraction.fingerprint = "0".repeat(64); }, pattern: /complete source extraction/ },
    { label: "program hash", mutate: (slot) => { slot.dsfxShaderExtraction.gles3Programs[1].programHash = "0".repeat(64); }, pattern: /incomplete GLES3 program/ },
    { label: "binding parameter", mutate: (slot) => { slot.dsfxShaderExtraction.bindings[0].parameterRecordSha256 = "0".repeat(64); }, pattern: /binding metadata/ },
    { label: "active custom offset", mutate: (slot) => { slot.materialProperties.floats._Custom_Data_Offset_Use = 1; }, pattern: /material scalar state/ },
    { label: "color tint", mutate: (slot) => { slot.materialProperties.colors._Color.r = 0; }, pattern: /active _Color tint/ },
    { label: "source cull state", mutate: (slot) => { slot.renderState.cullMode = "back"; }, pattern: /unverified render state/ },
    { label: "undeclared dynamic property", mutate: (slot) => { slot.materialProperties.floats._DistortionStrength = 1; }, pattern: /material property set/ },
  ];
  for (const testCase of tamperCases) {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-additive-tamper-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(texture, png);
      const { profile, textureReference } = staticDsfxProfile(0);
      const slot = profile.renderers[0].materialSlots[0];
      testCase.mutate(slot);
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [{ sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0, testCase.label);
      assert.match(result.stderr, testCase.pattern, testCase.label);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("binds the two exact AlphaBlend_0 translated state variants and rejects tampering", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
  const variants = [
    { id: "depth-tested-back-cull", depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false },
    { id: "depth-tested-off-double-sided", depthTest: true, depthFunction: "less-equal", cullMode: "off", doubleSided: true },
  ];
  for (const variant of variants) {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-alpha-variant-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(texture, png);
      const { profile, textureReference } = staticDsfxProfile(2, { renderStateVariant: variant.id });
      const slot = profile.renderers[0].materialSlots[0];
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [{ sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.equal(result.code, 0, result.stderr);
      const material = readGlbJson(await readFile(output)).materials[0];
      assert.equal(material.alphaMode, "BLEND");
      assert.equal(material.doubleSided, variant.doubleSided);
      assert.equal(material.extras.chibi.dsfxRenderStateVariant, variant.id);
      assert.equal(material.extras.chibi.depthTest, variant.depthTest);
      assert.equal(material.extras.chibi.depthFunction, variant.depthFunction);
      assert.equal(material.extras.chibi.cullMode, variant.cullMode);
      assert.equal(material.extras.chibi.doubleSided, variant.doubleSided);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  for (const tamper of [
    (slot) => { slot.dsfxRenderStateVariant = "depth-tested-back-cull"; slot.renderState.cullMode = "off"; slot.renderState.doubleSided = true; },
    (slot) => { delete slot.dsfxRenderStateVariant; },
  ]) {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-alpha-tamper-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(texture, png);
      const { profile, textureReference } = staticDsfxProfile(2, { renderStateVariant: "depth-tested-back-cull" });
      const slot = profile.renderers[0].materialSlots[0];
      tamper(slot);
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [{ sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /AlphaBlend_0 render-state variant|unverified render state/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("binds exact DSFX Glitch_Tex forward metadata and preserves its null MainTex default", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-glitch-tex-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), noise = path.join(root, "noise.png");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
    await writeFile(input, glbWithProjectMxRenderer({ materialNames: ["FX_MAT_Glitch_01"], rawBaseColor: true }));
    await writeFile(noise, png);
    const { profile } = glitchTexProfile();
    const slot = profile.renderers[0].materialSlots[0];
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
      sourceTextureExports: [{ sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_NoiseTex", textureReference: glitchTexNoiseReference, path: noise }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const material = document.materials[0], metadata = material.extras.chibi;
    assert.equal(material.alphaMode, "BLEND");
    assert.equal(material.doubleSided, false);
    assert.equal(material.pbrMetallicRoughness?.baseColorTexture, undefined);
    assert.deepEqual(material.extensions.KHR_materials_unlit, {});
    assert.equal(metadata.adapterId, "dsfx-glitch-tex");
    assert.equal(metadata.textureProperty, "_NoiseTex");
    assert.equal(metadata.glitchTextures.mainTex.default, "unity-white");
    assert.equal(metadata.glitchTextures.mainTex.index, undefined);
    assert.equal(Number.isInteger(metadata.glitchTextures.noiseTex.index), true);
    assert.equal(metadata.glitchShaderExtraction.passes.forward.programHash, glitchTexPassSpecs.forward.programHash);
    assert.equal(metadata.glitchShadowPass.programHash, glitchTexPassSpecs.shadow.programHash);
    assert.deepEqual(metadata.blend, { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 });
    assert.equal((await validateGlb(output)).valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("binds exact DSFX Matcap textures, tint, passes, attributes, and transparent source state", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-matcap-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const mainTexture = path.join(root, "main.png"), matcapTexture = path.join(root, "matcap.png");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
    await writeFile(input, glbWithProjectMxRenderer({ includeMaterialUnlit: true, includeUnrelatedUnlit: true, materialNames: ["FX_MAT_Matcap_01"], rawBaseColor: true }));
    await writeFile(mainTexture, png);
    await writeFile(matcapTexture, png);
    const profile = matcapProfile();
    const slot = profile.renderers[0].materialSlots[0];
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
      sourceTextureExports: [
        { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_Main_Tex", textureReference: matcapMainTextureReference, path: mainTexture },
        { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_Matcap_Tex", textureReference: matcapTextureReference, path: matcapTexture },
      ],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    assert.equal((await validateGlb(output)).valid, true);
    const document = readGlbJson(await readFile(output));
    const material = document.materials[0], metadata = material.extras.chibi;
    assert.equal(material.alphaMode, "BLEND");
    assert.equal(material.doubleSided, false);
    assert.equal(material.extensions?.KHR_materials_unlit, undefined);
    assert.deepEqual(document.materials[1].extensions?.KHR_materials_unlit, {});
    assert.equal(document.extensionsUsed.includes("KHR_materials_unlit"), true);
    assert.deepEqual(material.pbrMetallicRoughness.baseColorFactor, [0.30188679695129395, 0.055614907294511795, 0, 0.772549033164978]);
    assert.equal(metadata.adapterId, "dsfx-matcap");
    assert.equal(metadata.renderPass, "forward");
    assert.equal(metadata.textureProperty, "_Main_Tex");
    assert.equal(metadata.unlit, false);
    assert.deepEqual(metadata.matcapShaderExtraction, slot.matcapShaderExtraction);
    assert.deepEqual(metadata.matcapMaterialProperties, slot.materialProperties);
    assert.deepEqual(metadata.matcapShaderExtraction.passes.forward.requiredUniforms, matcapForwardStaticUniforms);
    assert.deepEqual(metadata.matcapShaderExtraction.passes.forwardInstanced.requiredUniforms, matcapForwardInstancedUniforms);
    assert.deepEqual(metadata.matcapShaderExtraction.passes.shadow.requiredUniforms, matcapShadowStaticUniforms);
    assert.deepEqual(metadata.matcapShaderExtraction.passes.shadowInstanced.requiredUniforms, matcapShadowInstancedUniforms);
    assert.equal(Number.isInteger(metadata.matcapTextures.mainTex.index), true);
    assert.equal(Number.isInteger(metadata.matcapTextures.matcapTex.index), true);
    assert.notEqual(metadata.matcapTextures.mainTex.index, metadata.matcapTextures.matcapTex.index);
    assert.equal(material.pbrMetallicRoughness.baseColorTexture.index, metadata.matcapTextures.mainTex.index);
    assert.deepEqual(metadata.blend, { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 });
    assert.equal(metadata.matcapShadowPass.programHash, matcapPassSpecs.shadow.programHash);
    assert.deepEqual(document.meshes[0].primitives[0].attributes, {
      POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, TANGENT: 3, COLOR_0: 4,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const [label, mutate, fixture, expected] of [
  ["forward pass provenance", (profile) => { profile.renderers[0].materialSlots[0].matcapShaderExtraction.passes.forward.programHash = "0".repeat(64); }, {}, /incomplete or tampered forward pass source pass/],
  ["Main_Tex identity", (profile) => { profile.renderers[0].materialSlots[0].materialProperties.textures[0].textureReference.objectId = "999"; }, {}, /unverified _Main_Tex source identity/],
  ["Matcap_Tex identity", (profile) => { profile.renderers[0].materialSlots[0].materialProperties.textures[1].textureReference.objectId = "999"; }, {}, /unverified _Matcap_Tex source identity/],
  ["Main_Color value", (profile) => { profile.renderers[0].materialSlots[0].materialProperties.colors._Main_Color.r = 1; }, {}, /unverified source scalar\/color state/],
  ["inert float residue value", (profile) => { profile.renderers[0].materialSlots[0].materialProperties.floats._Metallic = 0; }, {}, /unverified source scalar\/color state/],
  ["inert color residue value", (profile) => { profile.renderers[0].materialSlots[0].materialProperties.colors._SpecColor.r = 1; }, {}, /unverified source scalar\/color state/],
  ["inert residue in GLSL", (profile) => { profile.renderers[0].materialSlots[0].matcapShaderExtraction.passes.forward.glsl += "\\nuniform float _Metallic;\\n"; }, {}, /GLSL declares or consumes inert property _Metallic/],
  ["source render state", (profile) => { profile.renderers[0].materialSlots[0].renderState.depthWrite = false; }, {}, /unverified transparent source render state/],
  ["required COLOR_0", () => {}, { omitColor: true }, /does not preserve COLOR_0 source data/],
  ["instanced matrix-array declarations", (profile) => {
    const pass = profile.renderers[0].materialSlots[0].matcapShaderExtraction.passes.forwardInstanced;
    pass.glsl = pass.glsl.replaceAll("hlslcc_mtx4x4unity_ObjectToWorldArray", "hlslcc_mtx4x4unity_ObjectToWorld")
      .replaceAll("hlslcc_mtx4x4unity_WorldToObjectArray", "hlslcc_mtx4x4unity_WorldToObject");
  }, {}, /missing required hlslcc_mtx4x4unity_ObjectToWorldArray uniform/],
  ["shader identity", (profile) => { profile.renderers[0].materialSlots[0].sourceShaderParsedName = "DSFX/FX_SHADER_Glitch_Tex"; }, {}, /unverified source identity or program version/],
]) {
  test(`rejects tampered DSFX Matcap ${label}`, async () => {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-matcap-reject-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
      const mainTexture = path.join(root, "main.png"), matcapTexture = path.join(root, "matcap.png");
      const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
      await writeFile(input, glbWithProjectMxRenderer({ materialNames: ["FX_MAT_Matcap_01"], ...(fixture ?? {}) }));
      await writeFile(mainTexture, png);
      await writeFile(matcapTexture, png);
      const profile = matcapProfile();
      mutate(profile);
      const slot = profile.renderers[0].materialSlots[0];
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [
          { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_Main_Tex", textureReference: matcapMainTextureReference, path: mainTexture },
          { sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_Matcap_Tex", textureReference: matcapTextureReference, path: matcapTexture },
        ],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, expected);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

for (const [label, mutate, expected] of [
  ["forward pass hash", (slot) => { slot.glitchShaderExtraction.passes.forward.programHash = "0".repeat(64); }, /incomplete Forward source pass metadata/],
  ["active keyword", (slot) => { slot.materialProperties.keywords = ["INSTANCING_ON"]; }, /has active shader keywords/],
  ["NoiseTex identity", (slot) => { slot.materialProperties.textures[1].textureReference.objectId = "999"; }, /unverified _NoiseTex identity/],
]) {
  test(`rejects tampered DSFX Glitch_Tex ${label}`, async () => {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-glitch-tex-reject-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), noise = path.join(root, "noise.png");
      const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
      await writeFile(input, glbWithProjectMxRenderer({ materialNames: ["FX_MAT_Glitch_01"] }));
      await writeFile(noise, png);
      const { profile } = glitchTexProfile();
      mutate(profile.renderers[0].materialSlots[0]);
      const slot = profile.renderers[0].materialSlots[0];
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [{ sourceMaterialReference: slot.sourceMaterialReference, textureProperty: "_NoiseTex", textureReference: glitchTexNoiseReference, path: noise }],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, expected);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("accepts only source-proven inert stale properties on DSFX AlphaBlend_0", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
  for (const inertProperty of [
    "_GlossyReflections", "_EnvironmentReflections", "_LightingEnabled",
    "_OcclusionStrength", "_SpecularHighlights",
  ]) {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-inert-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(texture, png);
      const { profile, textureReference } = staticDsfxProfile(2, { inertProperty });
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [{ sourceMaterialReference: profile.renderers[0].materialSlots[0].sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.equal(result.code, 0, result.stderr);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  for (const [inertProperty, value] of [
    ["_EmissionColor", { r: 1, g: 0.5, b: 0.25, a: 1 }],
    ["_SpecColor", { r: 0.1, g: 0.2, b: 0.3, a: 1 }],
  ]) {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-inert-color-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(texture, png);
      const { profile, textureReference } = staticDsfxProfile(2);
      profile.renderers[0].materialSlots[0].materialProperties.colors[inertProperty] = value;
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [{ sourceMaterialReference: profile.renderers[0].materialSlots[0].sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.equal(result.code, 0, result.stderr);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("fails closed when DSFX AlphaBlend_0 extraction evidence is missing, incomplete, or declares an inert property", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64");
  const cases = [
    { label: "missing", mutate: (slot) => { delete slot.dsfxShaderExtraction; }, expected: /no complete source extraction/ },
    { label: "incomplete", mutate: (slot) => { slot.dsfxShaderExtraction.gles3Programs.pop(); }, expected: /expected 4/ },
    { label: "other-dynamic", mutate: (slot) => { slot.materialProperties.floats._DistortionEnabled = 1; }, expected: /dynamic gate is active/ },
  ];
  for (const { label, mutate, expected } of cases) {
    const root = await mkdtemp(path.join(tmpdir(), `chibi-profile-dsfx-extraction-${label}-`));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(texture, png);
      const { profile, textureReference } = staticDsfxProfile(2);
      mutate(profile.renderers[0].materialSlots[0]);
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [{ sourceMaterialReference: profile.renderers[0].materialSlots[0].sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, expected);
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  for (const inertProperty of [
    "_GlossyReflections", "_EnvironmentReflections", "_LightingEnabled",
    "_OcclusionStrength", "_SpecularHighlights", "_EmissionColor", "_SpecColor",
  ]) {
    const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-extraction-declared-"));
    try {
      const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
      await writeFile(input, glbWithProfileRenderer());
      await writeFile(texture, png);
      const { profile, textureReference } = staticDsfxProfile(2);
      profile.renderers[0].materialSlots[0].dsfxShaderExtraction.gles3Programs[0].glsl += `\\nuniform float ${inertProperty};\\n`;
      await writeFile(config, JSON.stringify({
        sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
        sourceTextureExports: [{ sourceMaterialReference: profile.renderers[0].materialSlots[0].sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
      }));
      const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, new RegExp(`declares or consumes inert property ${inertProperty}`));
      assert.equal(await access(output).then(() => true, () => false), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("rejects a static DSFX profile with an unverified dynamic distortion property set", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-dynamic-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
    await writeFile(input, glbWithProfileRenderer());
    await writeFile(texture, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64"));
    const { profile, textureReference } = staticDsfxProfile(1, { dynamic: true });
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
      sourceTextureExports: [{ sourceMaterialReference: profile.renderers[0].materialSlots[0].sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /unverified material property set/);
    assert.equal(await access(output).then(() => true, () => false), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects an unproven stale color field on the exact AlphaBlend_Add profile", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-dsfx-dynamic-color-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "fx.png");
    await writeFile(input, glbWithProfileRenderer());
    await writeFile(texture, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64"));
    const { profile, textureReference } = staticDsfxProfile(1);
    profile.renderers[0].materialSlots[0].materialProperties.colors._SpecColor = { r: 1, g: 0.5, b: 0.25, a: 1 };
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
      sourceTextureExports: [{ sourceMaterialReference: profile.renderers[0].materialSlots[0].sourceMaterialReference, textureProperty: "_Texture", textureReference, path: texture }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /AlphaBlend_Add adapter has an unverified material property set/);
    assert.equal(await access(output).then(() => true, () => false), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not restore a profile MainTex from a same-name but different source texture", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-maintex-identity-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), texture = path.join(root, "other.png");
    await writeFile(input, glbWithProfileRenderer());
    await writeFile(texture, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==", "base64"));
    const profile = renderingProfile({ mouth: false });
    const slot = profile.renderers[0].materialSlots[0];
    const textureReference = { bundleSha256: "d".repeat(64), serializedFile: "CAB-textures", objectId: "9007199254741001" };
    slot.adapterId = "mx-character-general";
    slot.materialProperties.textures = [{
      name: "_MainTex", texture: { file: "CAB-textures", pathId: textureReference.objectId }, textureReference,
      scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
    }];
    await writeFile(config, JSON.stringify({
      sourceIdentity: "fixture", exportClips: [], renderingProfile: profile,
      sourceMainTextureExports: [{
        sourceMaterialReference: slot.sourceMaterialReference,
        textureReference: { ...textureReference, objectId: "9007199254741002" },
        path: texture,
      }],
    }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /no unique exact source texture export is available/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("uses the resolved shader tint instead of an undeclared serialized _Color", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-face-tint-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    await writeFile(input, glbWithProfileRenderer());
    const profile = renderingProfile({ mouth: false });
    const slot = profile.renderers[0].materialSlots[0];
    slot.adapterId = "mx-character-face";
    slot.materialProperties.colors = { _Color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, _Tint: { r: 1, g: 1, b: 1, a: 1 } };
    slot.adapterSettings.baseColorTint = [1, 1, 1, 1];
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    assert.deepEqual(document.materials[0].pbrMetallicRoughness.baseColorFactor, [1, 1, 1, 1]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a source hierarchy path that maps to multiple GLB renderer nodes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-ambiguous-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    await writeFile(input, glbWithProfileRenderer(undefined, true));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: renderingProfile({ mouth: false }) }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Fixture\/Body maps to 2 GLB nodes; expected exactly one/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts duplicate GLB material slots when they share one exact source material identity", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-duplicate-material-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const document = {
      asset: { version: "2.0" },
      buffers: [{ byteLength: 0 }],
      scenes: [{ nodes: [0] }], scene: 0,
      nodes: [{ name: "RootNode", children: [1] }, { name: "Fixture", children: [2] }, { name: "Body", mesh: 0 }],
      meshes: [{ primitives: [{ material: 0 }, { material: 1 }] }],
      materials: [{ name: "Fixture_Weapon" }, { name: "Fixture_Weapon.001" }],
      animations: [],
    };
    const source = Buffer.from(JSON.stringify(document));
    const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
    const glb = Buffer.alloc(12 + 8 + json.length + 8);
    glb.write("glTF"); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
    glb.writeUInt32LE(json.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); json.copy(glb, 20);
    const binaryOffset = 20 + json.length;
    glb.writeUInt32LE(0, binaryOffset); glb.writeUInt32LE(0x004e4942, binaryOffset + 4);
    await writeFile(input, glb);
    const sourceReference = { bundleSha256: "b".repeat(64), serializedFile: "CAB-materials", objectId: "9007199254740995" };
    const rendererReference = { bundleSha256: "a".repeat(64), serializedFile: "CAB-fixture", objectId: "9007199254740993" };
    const slot = (index) => ({
      slot: index, sourceMaterialReference: sourceReference, sourceMaterialName: "Fixture_Weapon",
      sourceShaderReference: { bundleSha256: "c".repeat(64), serializedFile: "CAB-shaders", objectId: "9007199254740997" },
      sourceShaderName: "MXWeapon", sourceShaderParsedName: "MX/C-Weapon", shaderProgramBlobSha256: "f".repeat(64),
      adapterId: "mx-character-weapon", materialProperties: { floats: {}, ints: {}, colors: {}, textures: [] },
      adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: [1, 1, 1, 1] },
      renderState: { sourceQueue: -1, layer: "opaque", alphaMode: "OPAQUE", depthWrite: true, depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false, blend: { source: 1, destination: 0 } },
      glb: null,
    });
    const profile = {
      schemaVersion: 1, profileVersion: "chibi-rendering-profile-v1", adapterVersion: "mx-character-adapters-v1", sourceIdentity: "fixture", dependencyFingerprint: "fixture-fingerprint",
      sourcePrefab: { path: "Assets/Fixture.prefab", reference: rendererReference },
      renderers: [{ sourceReference: rendererReference, name: "Fixture_Body", hierarchyPath: "Fixture/Body", rendererType: "SkinnedMeshRenderer", defaultVisible: true,
        sourceMesh: { file: "CAB-mesh", pathId: "1", sourceReference: { bundleSha256: "e".repeat(64), serializedFile: "CAB-mesh", objectId: "1" } }, materialSlots: [slot(0), slot(1)] }],
      mouth: null, drawSequence: [`${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}`], validation: { valid: true, unresolved: [] },
    };
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const processed = readGlbJson(await readFile(output));
    assert.equal(processed.scenes[0].extras.chibi.renderingProfile.renderers[0].materialSlots[0].glb.primitiveIndices.length, 1);
    assert.equal(processed.scenes[0].extras.chibi.renderingProfile.renderers[0].materialSlots[1].glb.primitiveIndices.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects ordered duplicate material names with different exact source identities", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-duplicate-identity-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const document = {
      asset: { version: "2.0" }, buffers: [{ byteLength: 0 }], scenes: [{ nodes: [0] }], scene: 0,
      nodes: [{ name: "RootNode", children: [1] }, { name: "Fixture", children: [2] }, { name: "Body", mesh: 0 }],
      meshes: [{ primitives: [{ material: 0 }, { material: 1 }] }],
      materials: [{ name: "Fixture_Weapon" }, { name: "Fixture_Weapon" }], animations: [],
    };
    const source = Buffer.from(JSON.stringify(document));
    const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
    const glb = Buffer.alloc(12 + 8 + json.length + 8);
    glb.write("glTF"); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
    glb.writeUInt32LE(json.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); json.copy(glb, 20);
    const binaryOffset = 20 + json.length;
    glb.writeUInt32LE(0, binaryOffset); glb.writeUInt32LE(0x004e4942, binaryOffset + 4);
    await writeFile(input, glb);
    const rendererReference = { bundleSha256: "a".repeat(64), serializedFile: "CAB-fixture", objectId: "9007199254740993" };
    const makeSlot = (slot, objectId) => ({
      slot, sourceMaterialReference: { bundleSha256: "b".repeat(64), serializedFile: "CAB-materials", objectId }, sourceMaterialName: "Fixture_Weapon",
      sourceShaderReference: { bundleSha256: "c".repeat(64), serializedFile: "CAB-shaders", objectId: "9007199254740997" }, sourceShaderName: "MXWeapon", sourceShaderParsedName: "MX/C-Weapon", shaderProgramBlobSha256: "f".repeat(64),
      adapterId: "mx-character-weapon", materialProperties: { floats: {}, ints: {}, colors: {}, textures: [] },
      adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: [1, 1, 1, 1] },
      renderState: { sourceQueue: -1, layer: "opaque", alphaMode: "OPAQUE", depthWrite: true, depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false, blend: { source: 1, destination: 0 } }, glb: null,
    });
    const profile = {
      schemaVersion: 1, profileVersion: "chibi-rendering-profile-v1", adapterVersion: "chibi-adapters-v1", sourceIdentity: "fixture", dependencyFingerprint: "fixture-fingerprint",
      sourcePrefab: { path: "Assets/Fixture.prefab", reference: rendererReference },
      renderers: [{ sourceReference: rendererReference, name: "Fixture_Body", hierarchyPath: "Fixture/Body", rendererType: "SkinnedMeshRenderer", defaultVisible: true,
        sourceMesh: { file: "CAB-mesh", pathId: "1", sourceReference: { bundleSha256: "e".repeat(64), serializedFile: "CAB-mesh", objectId: "1" } }, materialSlots: [makeSlot(0, "9007199254740995"), makeSlot(1, "9007199254740996")] }],
      mouth: null, drawSequence: [`${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}`], validation: { valid: true, unresolved: [] },
    };
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /repeated material name Fixture_Weapon with different source material identities/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts an exporter-collapsed primitive shared by duplicate exact source material slots", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-collapsed-material-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    const document = {
      asset: { version: "2.0" }, buffers: [{ byteLength: 0 }], scenes: [{ nodes: [0] }], scene: 0,
      nodes: [{ name: "RootNode", children: [1] }, { name: "Fixture", children: [2] }, { name: "Body", mesh: 0 }],
      meshes: [{ primitives: [{ material: 0 }] }], materials: [{ name: "Fixture_Weapon" }], animations: [],
    };
    const source = Buffer.from(JSON.stringify(document));
    const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]);
    const glb = Buffer.alloc(12 + 8 + json.length + 8);
    glb.write("glTF"); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
    glb.writeUInt32LE(json.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); json.copy(glb, 20);
    const binaryOffset = 20 + json.length; glb.writeUInt32LE(0, binaryOffset); glb.writeUInt32LE(0x004e4942, binaryOffset + 4);
    await writeFile(input, glb);
    const rendererReference = { bundleSha256: "a".repeat(64), serializedFile: "CAB-fixture", objectId: "9007199254740993" };
    const sourceReference = { bundleSha256: "b".repeat(64), serializedFile: "CAB-materials", objectId: "9007199254740995" };
    const makeSlot = (slot) => ({ slot, sourceMaterialReference: sourceReference, sourceMaterialName: "Fixture_Weapon", sourceShaderReference: { bundleSha256: "c".repeat(64), serializedFile: "CAB-shaders", objectId: "9007199254740997" }, sourceShaderName: "MXWeapon", sourceShaderParsedName: "MX/C-Weapon", shaderProgramBlobSha256: "f".repeat(64), adapterId: "mx-character-weapon", materialProperties: { floats: {}, ints: {}, colors: {}, textures: [] }, adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: [1, 1, 1, 1] }, renderState: { sourceQueue: -1, layer: "opaque", alphaMode: "OPAQUE", depthWrite: true, depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false, blend: { source: 1, destination: 0 } }, glb: null });
    const profile = { schemaVersion: 1, profileVersion: "chibi-rendering-profile-v1", adapterVersion: "chibi-adapters-v1", sourceIdentity: "fixture", dependencyFingerprint: "fixture-fingerprint", sourcePrefab: { path: "Assets/Fixture.prefab", reference: rendererReference }, renderers: [{ sourceReference: rendererReference, name: "Fixture_Body", hierarchyPath: "Fixture/Body", rendererType: "SkinnedMeshRenderer", defaultVisible: true, sourceMesh: { file: "CAB-mesh", pathId: "1", sourceReference: { bundleSha256: "e".repeat(64), serializedFile: "CAB-mesh", objectId: "1" } }, materialSlots: [makeSlot(0), makeSlot(1)] }], mouth: null, drawSequence: [`${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}`], validation: { valid: true, unresolved: [] } };
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const processed = readGlbJson(await readFile(output));
    const slots = processed.scenes[0].extras.chibi.renderingProfile.renderers[0].materialSlots;
    assert.deepEqual(slots.map(slot => slot.glb.primitiveIndices), [[0], [0]]);
    assert.deepEqual(slots.map(slot => slot.glb.materialIndices), [[0], [0]]);
    assert.deepEqual(processed.materials[0].extras.chibi.renderingProfileSlots, [
      `${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}#0`,
      `${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}#1`,
    ]);
    assert.equal(processed.materials[0].extras.chibi.renderingProfileSlot, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("clones a deduplicated GLB material when renderer slots have conflicting exact state", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-conflicting-material-state-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json");
    await writeFile(input, glbWithMouthOnlyAndSeparateEyeRenderers());
    const profile = renderingProfileWithSeparateEyeRenderer();
    profile.mouth = null;
    profile.renderers[1].materialSlots[0].renderState = {
      ...profile.renderers[1].materialSlots[0].renderState,
      depthWrite: false,
    };
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: profile }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const processed = readGlbJson(await readFile(output));
    const [body, face] = processed.scenes[0].extras.chibi.renderingProfile.renderers;
    const bodyMaterial = body.materialSlots[0].glb.materialIndex;
    const faceMaterial = face.materialSlots[0].glb.materialIndex;
    assert.equal(bodyMaterial, 0);
    assert.equal(faceMaterial, 1);
    assert.notEqual(faceMaterial, bodyMaterial);
    assert.equal(processed.meshes[0].primitives[0].material, bodyMaterial);
    assert.equal(processed.meshes[1].primitives[0].material, faceMaterial);
    assert.equal(processed.materials[bodyMaterial].extras.chibi.renderOrder, 10000);
    assert.equal(processed.materials[bodyMaterial].extras.chibi.depthWrite, true);
    assert.equal(processed.materials[faceMaterial].extras.chibi.renderOrder, 10001);
    assert.equal(processed.materials[faceMaterial].extras.chibi.depthWrite, false);
    assert.deepEqual(processed.materials[bodyMaterial].extras.chibi.renderingProfileSlots, [
      `${profile.renderers[0].sourceReference.bundleSha256}:${profile.renderers[0].sourceReference.serializedFile.toLowerCase()}:${profile.renderers[0].sourceReference.objectId}#0`,
    ]);
    assert.deepEqual(processed.materials[faceMaterial].extras.chibi.renderingProfileSlots, [
      `${profile.renderers[1].sourceReference.bundleSha256}:${profile.renderers[1].sourceReference.serializedFile.toLowerCase()}:${profile.renderers[1].sourceReference.objectId}#0`,
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const profiled of [false, true]) {
  for (const [label, uv] of [
    ["point", [.5, .5, .5, .5, .5, .5, .1, .8, .1, .8, .1, .8]],
    ["line", [.5, .4, .5, .5, .5, .6, .1, .8, .15, .8, .2, .8]],
    ["boundary", [.25, .5, .25, .5, .25, .5, .25, .75, .25, .75, .25, .75]],
    ["crossing line", [.1, .8, .4, .8, .1, .8, .1, .8, .1, .8, .1, .8]],
  ]) {
    test(`preserves collapsed ${label} UV geometry through ${profiled ? "profile" : "legacy"} mouth splitting`, async () => {
      const root = await mkdtemp(path.join(tmpdir(), "chibi-collapsed-face-uv-"));
      try {
        const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), atlas = path.join(root, "mouth.png");
        await writeFile(input, glbWithProfileRenderer(uv));
        await writeFile(atlas, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], mouthTexturePath: atlas, ...(profiled ? { renderingProfile: renderingProfile() } : {}) }));
        const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
        assert.equal(result.code, 0, result.stderr);
        const bytes = await readFile(output), document = readGlbJson(bytes), binary = readGlbBinary(bytes);
        const [eye, mouth] = document.meshes[0].primitives;
        assert.equal(document.accessors[eye.indices].count, 3);
        assert.equal(document.accessors[mouth.indices].count, label === "crossing line" ? 9 : 3);
        if (label !== "crossing line") {
          assert.deepEqual(readDocumentAccessor(document, binary, eye.indices).flat(), [0, 1, 2]);
          assert.deepEqual(readDocumentAccessor(document, binary, mouth.indices).flat(), [3, 4, 5]);
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
}

test("clips mouth triangles that cross the verified source UV threshold", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-mouth-seam-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), atlas = path.join(root, "mouth.png");
    const uv = [.1, .8, .3, .8, .1, .9, .1, .8, .2, .8, .1, .9];
    await writeFile(input, glbWithProfileRenderer(uv));
    await writeFile(atlas, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: renderingProfile(), mouthTexturePath: atlas }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const profile = document.scenes[0].extras.chibi.renderingProfile;
    assert.deepEqual(profile.mouth.glbPrimitiveIndices, { eyes: [0], mouth: [1] });
    assert.equal(document.meshes[0].primitives.length, 2);
    assert.equal(readGlbBinary(await readFile(output)).length > 0, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("clips four crossing mouth triangles while preserving interpolated attributes, skinning, and morph targets", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-mouth-seam-attributes-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), atlas = path.join(root, "mouth.png");
    await writeFile(input, glbWithFourMouthSeamTriangles());
    await writeFile(atlas, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], eyeMouthMaterialNames: ["Fixture_EyeMouth"], mouthTexturePath: atlas }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const outputBytes = await readFile(output);
    const document = readGlbJson(outputBytes), binary = readGlbBinary(outputBytes);
    const [eyes, mouth] = document.meshes[0].primitives;
    assert.equal(eyes.material, 0);
    assert.equal(mouth.material, 1);
    assert.equal(eyes.indices !== mouth.indices, true);
    assert.equal(document.nodes.find(node => node.mesh === 0).skin, 0, "node skin binding was lost during seam clipping");
    for (const primitive of [eyes, mouth]) {
      assert.equal(document.accessors[primitive.indices].count % 3, 0, "clipped index buffer is not triangle-aligned");
      for (const semantic of ["POSITION", "NORMAL", "TEXCOORD_0", "COLOR_1", "TANGENT", "JOINTS_0", "WEIGHTS_0"]) {
        assert.equal(Number.isInteger(primitive.attributes[semantic]), true, `${semantic} was lost during seam clipping`);
        assert.equal(document.accessors[primitive.attributes[semantic]].count, primitive === eyes ? 12 : 24, `${semantic} vertex count changed unexpectedly`);
      }
      assert.equal(Number.isInteger(primitive.targets?.[0]?.POSITION), true, "morph target was lost during seam clipping");
      assert.equal(document.accessors[primitive.targets[0].POSITION].count, primitive === eyes ? 12 : 24);
    }
    const eyeColors = readDocumentAccessor(document, binary, eyes.attributes.COLOR_1);
    assert.equal(eyeColors.some(row => Math.abs(row[0] - .75) < 1e-6), true, "crossing color was not interpolated");
    const eyeJoints = readDocumentAccessor(document, binary, eyes.attributes.JOINTS_0);
    const eyeWeights = readDocumentAccessor(document, binary, eyes.attributes.WEIGHTS_0);
    for (let index = 0; index < eyeJoints.length; index += 1) {
      assert.equal(eyeJoints[index].every(Number.isInteger), true);
      assert.equal(eyeJoints[index].every(joint => joint >= 0 && joint < 8), true);
      assert.equal(eyeWeights[index].every(Number.isFinite), true);
      assert.ok(Math.abs(eyeWeights[index].reduce((sum, weight) => sum + weight, 0) - 1) < 1e-6);
    }
    assert.equal(eyeJoints.some((row, index) => row[0] === 1 && Math.abs(eyeWeights[index][0] - .75) < 1e-6), true, "crossing skin weights were not interpolated");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("applies the same topology-safe seam clipping through a source rendering profile", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-profile-mouth-seam-attributes-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), atlas = path.join(root, "mouth.png");
    await writeFile(input, glbWithFourMouthSeamTriangles());
    await writeFile(atlas, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], renderingProfile: renderingProfile(), mouthTexturePath: atlas }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.equal(result.code, 0, result.stderr);
    const document = readGlbJson(await readFile(output));
    const profile = document.scenes[0].extras.chibi.renderingProfile;
    assert.deepEqual(profile.mouth.glbPrimitiveIndices, { eyes: [0], mouth: [1] });
    assert.equal(document.meshes[0].primitives[0].material, 0);
    assert.equal(document.meshes[0].primitives[1].material, profile.mouth.glbMaterialIndex);
    const mouthPrimitive = document.meshes[0].primitives[1];
    assert.equal(document.accessors[mouthPrimitive.attributes.COLOR_1].count, 24);
    assert.equal(document.accessors[mouthPrimitive.targets[0].POSITION].count, 24);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects seam clipping for non-triangle primitive modes with a precise diagnostic", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-mouth-seam-mode-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), atlas = path.join(root, "mouth.png");
    await writeFile(input, glbWithFourMouthSeamTriangles({ mode: 5 }));
    await writeFile(atlas, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], eyeMouthMaterialNames: ["Fixture_EyeMouth"], mouthTexturePath: atlas }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /primitive mode 5; topology-safe mouth clipping supports TRIANGLES only/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects seam clipping for non-indexed primitives with a precise diagnostic", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-mouth-seam-indexing-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), atlas = path.join(root, "mouth.png");
    await writeFile(input, glbWithFourMouthSeamTriangles({ indexed: false }));
    await writeFile(atlas, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], eyeMouthMaterialNames: ["Fixture_EyeMouth"], mouthTexturePath: atlas }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /non-indexed; topology-safe mouth clipping requires indexed TRIANGLES/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects seam clipping when interpolated skin influences exceed the source accessor capacity", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chibi-mouth-seam-skin-"));
  try {
    const input = path.join(root, "input.glb"), output = path.join(root, "output.glb"), config = path.join(root, "config.json"), atlas = path.join(root, "mouth.png");
    await writeFile(input, glbWithFourMouthSeamTriangles({ jointOverflow: true }));
    await writeFile(atlas, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(config, JSON.stringify({ sourceIdentity: "fixture", exportClips: [], eyeMouthMaterialNames: ["Fixture_EyeMouth"], mouthTexturePath: atlas }));
    const result = await runPostprocess(path.resolve("scripts/chibi-postprocess.mjs"), input, output, config);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /seam interpolation needs 6 joint influences, exceeding the 4-slot source skinning accessor/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
