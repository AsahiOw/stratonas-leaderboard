import assert from 'node:assert/strict';
import test from 'node:test';
import { repairFaceSkin } from './chibi-face-skin.mjs';

function fixture() {
  const json = { nodes: [{ mesh: 0, skin: 0 }, { name: 'Head' }, { name: 'Neck' }, { name: 'Eye' }],
    skins: [{ joints: [1, 2, 3] }], meshes: [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 } }] }] };
  const sources = [{ hierarchyPath: 'Root/Face', bones: ['Eye', 'Head'], positions: [[-1, 2, 3], [-2, 3, 4]],
    joints: [[0, 1, 0, 0], [1, 0, 0, 0]], weights: [[.9, .1, 0, 0], [1, 0, 0, 0]] }];
  const arrays = [[[.01, .02, .03], [.02, .03, .04]], [[1, 0, 0, 0], [0, 0, 0, 0]], [[.9, .1, 0, 0], [1, 0, 0, 0]]];
  return { json, sources, arrays, run: () => repairFaceSkin(json, sources, ['Root/Face'], i => arrays[i], rows => arrays.push(rows) - 1) };
}

test('restores a corrupted eye-to-neck influence using source weights and the exported bone order', () => {
  const f = fixture();
  assert.equal(f.run(), 1);
  const attributes = f.json.meshes[0].primitives[0].attributes;
  assert.deepEqual(f.arrays[attributes.JOINTS_0], [[2, 0, 0, 0], [0, 0, 0, 0]]);
  assert.deepEqual(f.arrays[attributes.WEIGHTS_0], f.sources[0].weights);
  assert.equal(f.run(), 0);
});

test('does not rewrite valid assignments, including source-authored neck influences', () => {
  const f = fixture();
  f.sources[0].bones[0] = 'Neck';
  assert.equal(f.run(), 0);
  assert.equal(f.arrays.length, 3);
});

test('pads two source influences to the GLB four-component representation', () => {
  const f = fixture();
  f.sources[0].joints = f.sources[0].joints.map(row => row.slice(0, 2));
  f.sources[0].weights = f.sources[0].weights.map(row => row.slice(0, 2));
  assert.equal(f.run(), 1);
  assert.deepEqual(f.arrays[f.json.meshes[0].primitives[0].attributes.JOINTS_0][0], [2, 0, 0, 0]);
});

test('restores arm influences and leaves a matching arm mesh unchanged', () => {
  const f = fixture();
  f.sources[0].hierarchyPath = 'Root/Arm02';
  f.sources[0].bones = ['Hand', 'Forearm'];
  f.json.nodes[1].name = 'Forearm';
  f.json.nodes[2].name = 'UpperArmTwist';
  f.json.nodes[3].name = 'Hand';
  const run = () => repairFaceSkin(f.json, f.sources, ['Root/Arm02'], i => f.arrays[i], rows => f.arrays.push(rows) - 1);
  assert.equal(run(), 1);
  assert.deepEqual(f.arrays[f.json.meshes[0].primitives[0].attributes.JOINTS_0][0], [2, 0, 0, 0]);
  const before = JSON.stringify(f.json), count = f.arrays.length;
  assert.equal(run(), 0);
  assert.equal(JSON.stringify(f.json), before);
  assert.equal(f.arrays.length, count);
});

test('rejects missing bones and conflicting coincident vertices before modifying the mesh', () => {
  for (const mutate of [
    f => { f.sources[0].bones[0] = 'Missing'; },
    f => { f.sources[0].positions[1] = f.sources[0].positions[0]; },
    f => { f.arrays[0][0][0] += .1; },
  ]) {
    const f = fixture(); mutate(f);
    assert.throws(f.run);
    assert.equal(f.arrays.length, 3);
  }
});

test('resolves coincident surfaces by source UVs without trusting exported weights', () => {
  const f = fixture();
  f.sources[0].positions[1] = f.sources[0].positions[0];
  f.arrays[0][1] = f.arrays[0][0];
  f.sources[0].uvs = [[.2, .3], [.6, .7]];
  f.arrays.push([[.2, .7], [.6, .3]]);
  f.json.meshes[0].primitives[0].attributes.TEXCOORD_0 = 3;
  assert.equal(f.run(), 1);
  assert.deepEqual(f.arrays[f.json.meshes[0].primitives[0].attributes.JOINTS_0], [[2, 0, 0, 0], [0, 0, 0, 0]]);
  assert.equal(f.run(), 0);
});

test('uses reflected source normals when coincident vertices also share UVs', () => {
  const f = fixture();
  f.sources[0].positions[1] = f.sources[0].positions[0];
  f.arrays[0][1] = f.arrays[0][0];
  f.sources[0].normals = [[1, 0, 0], [-1, 0, 0]];
  f.arrays.push([[-1, 0, 0], [1, 0, 0]]);
  f.json.meshes[0].primitives[0].attributes.NORMAL = 3;
  assert.equal(f.run(), 1);
  f.sources[0].normals[1] = f.sources[0].normals[0];
  const before = JSON.stringify(f.json), count = f.arrays.length;
  assert.throws(f.run, /Ambiguous face skin vertex/);
  assert.equal(JSON.stringify(f.json), before);
  assert.equal(f.arrays.length, count);
});
