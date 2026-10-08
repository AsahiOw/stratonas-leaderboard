import assert from 'node:assert/strict';
import test from 'node:test';
import { restoreRootRotations, restoreStaticMeshTranslations } from './chibi-root-rotations.mjs';

test('restores static mesh offsets only for unanimated source positions and generated zero channels', () => {
  for (const mutation of ['valid', 'authored', 'moving', 'wrong-rest', 'skin', 'ambiguous']) {
    const json = { nodes: [{ mesh: 0, translation: [0, -.01, .002] }], animations: [{ name: 'Idle',
      channels: [{ target: { node: 0, path: 'translation' }, sampler: 0 }], samplers: [{ output: 0 }] }] };
    const source = { hierarchyPath: 'Root/Mesh', sourceReference: { objectId: '1' }, restTranslation: [0, -1, .2], clips: ['Idle'] };
    const arrays = [[[0, 0, 0], [0, 0, 0]]], paths = ['Root/Mesh'];
    if (mutation === 'authored') source.clips = [];
    if (mutation === 'moving') arrays[0][1][1] = .1;
    if (mutation === 'wrong-rest') source.restTranslation = [0, 1, .2];
    if (mutation === 'skin') json.nodes[0].skin = 0;
    if (mutation === 'ambiguous') { json.nodes.push({ ...json.nodes[0] }); paths.push(paths[0]); }
    const count = restoreStaticMeshTranslations(json, [source], paths, i => arrays[i], rows => { arrays.push(rows); return arrays.length - 1; });
    assert.equal(count, mutation === 'valid' ? 1 : 0);
    if (count) assert.deepEqual(arrays[1], [[0, -.01, .002], [0, -.01, .002]]);
  }
});
function fixture() {
  const json = { nodes: [{ rotation: [0, 0, 0, 1] }], accessors: [{}, {}], animations: [{ name: 'Pickup', channels: [{ target: { node: 0, path: 'rotation' }, sampler: 0 }], samplers: [{ input: 0, output: 1, interpolation: 'LINEAR' }] }] };
  const arrays = [[[0], [1]], [[0, 0, 0, 1], [.70710678, 0, 0, .70710678]]];
  const source = { clip: 'Pickup', hierarchyPath: 'Root/Bone', restRotation: [0, 0, 0, 1], times: [0, 1], values: [[0, 0, 0, 1], [0, .70710678, 0, .70710678]] };
  return { json, source, arrays, run: () => restoreRootRotations(json, [source], ['Root/Bone'], i => arrays[i], rows => {arrays.push(rows);json.accessors.push({});return arrays.length - 1;}) };
}
test('restores exact root rotation and leaves an already matching track unchanged', () => {
  const f = fixture(); assert.equal(f.run(), 1);
  assert.deepEqual(f.arrays[f.json.animations[0].samplers[0].output], f.source.values);
  assert.equal(f.run(), 0);
});
test('does not retarget incompatible rest axes or unrelated animation names', () => {
  const f = fixture(); f.source.restRotation = [1, 0, 0, 0]; assert.equal(f.run(), 0);
  f.source.restRotation = [0, 0, 0, 1]; f.source.clip = 'Other'; assert.equal(f.run(), 0);
});
test('restores source translation with the verified rest-position unit scale', () => {
  const f = fixture();
  f.json.nodes[0].translation = [0, 0, .0035];
  f.json.animations[0].channels[0].target.path = 'translation';
  Object.assign(f.source, { targetPath: 'translation', restTranslation: [0, 0, .35], values: [[0, 0, .33], [0, 0, .34]] });
  f.arrays[1] = [[0, .0033, 0], [0, 0, .0034]];
  assert.equal(f.run(), 1);
  const rows = f.arrays[f.json.animations[0].samplers[0].output];
  assert.ok(Math.abs(rows[0][2] - .0033) < 1e-10);
  assert.equal(rows[0][1], 0);
  assert.equal(f.run(), 0);
});
test('does not guess translation scale for a zero or incompatible rest position', () => {
  const f = fixture();
  f.json.animations[0].channels[0].target.path = 'translation';
  Object.assign(f.source, { targetPath: 'translation', restTranslation: [0, 0, 0], values: [[0, 0, 0], [0, 0, 1]] });
  assert.equal(f.run(), 0);
  f.source.restTranslation = [0, 0, 1]; f.json.nodes[0].translation = [1, 0, 0];
  assert.equal(f.run(), 0);
});

test('restores corrupted hair scale from source without flattening authored scale animation', () => {
  const f = fixture();
  f.json.animations[0].channels[0].target.path = 'scale';
  Object.assign(f.source, { targetPath: 'scale', restScale: [1, 1, 1], values: [[1, 1, 1], [.3256, .0008336, -.11075]] });
  f.arrays[1] = [[366.8436, .178497, 39.02856], [366.8436, .178497, 39.02856]];
  assert.equal(f.run(), 1);
  assert.deepEqual(f.arrays[f.json.animations[0].samplers[0].output], f.source.values);
  assert.equal(f.run(), 0);
  f.json.nodes[0].scale = [2, 1, 1];
  assert.equal(f.run(), 0, 'incompatible rest scale must not be guessed');
});
