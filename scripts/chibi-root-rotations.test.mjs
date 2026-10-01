import assert from 'node:assert/strict';
import test from 'node:test';
import { restoreRootRotations } from './chibi-root-rotations.mjs';
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
