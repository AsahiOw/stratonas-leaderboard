import assert from 'node:assert/strict';
import test from 'node:test';
import { bindHaloFollow, removeUnboundHaloTransforms } from './chibi-halo-follow.mjs';
test('removes wrongly bound halo child motion with exact source proof, preserving authored channels', () => {
 const ref = { bundleSha256: 'bundle', serializedFile: 'CAB', objectId: '1' };
 for (const mutation of ['valid', 'other-source', 'ambiguous', 'skin', 'outside-follow']) {
  const json = { nodes: [{ mesh: 0, translation: [0, -1, .2], extras: { chibi: { sourceReference: ref } } }],
   animations: ['Idle', 'Authored'].map(name => ({ name, channels: [
    { target: { node: 0, path: 'translation' }, sampler: 0 }, { target: { node: 0, path: 'rotation' }, sampler: 1 }], samplers: [{ output: 0 }, { output: 1 }] })) };
  const paths = ['Cafe/Hover/Halo'], record = { hierarchyPath: paths[0], sourceReference: { ...ref }, targetPath: 'translation', clips: ['Idle'] };
  if (mutation === 'other-source') record.sourceReference.objectId = '2';
  if (mutation === 'ambiguous') { paths.push(paths[0]); json.nodes.push(structuredClone(json.nodes[0])); }
  if (mutation === 'skin') json.nodes[0].skin = 0;
  const count = removeUnboundHaloTransforms(json, { bindings: [{ haloPath: mutation === 'outside-follow' ? 'Other' : 'Cafe/Hover' }], unboundHaloTransforms: [record] }, paths);
  assert.equal(count, mutation === 'valid' ? 1 : 0);
  assert.equal(json.animations[1].channels.length, 2);
  assert.deepEqual(json.nodes[0].translation, [0, -1, .2]);
  if (count) assert.equal(json.animations[0].channels[0].target.path, 'rotation');
 }
});
const source = { bindings: [{ haloPath: 'Cafe/Hover', targetPath: 'Cafe/Rig/Target', haloRestPosition: [0, 1, -.2], offset: [.3, -.2, 0], rotation: [0, 0, 0, 1], clampMin: [.2, -.3, -.2], clampMax: [.4, -.1, .2], positionPower: .1, rotationPower: .07, fixYRotation: false, targetReference: { objectId: '123' } }], warnings: [] };
function document() { return { scenes: [{ nodes: [0] }], nodes: [{ name: 'RootNode', children: [1] }, { name: 'Cafe', children: [2, 3] }, { name: 'Hover', translation: [0, 100, -20] }, { name: 'Rig', children: [4] }, { name: 'Target' }] }; }
test('binds exact exported paths and verified units without modifying model transforms', () => {
 const json = document(), original = structuredClone(json), result = bindHaloFollow(json, source);
 assert.equal(result.bindings.length, 1); assert.equal(result.bindings[0].haloNodeIndex, 2); assert.equal(result.bindings[0].targetNodeIndex, 4);
 assert.equal(result.bindings[0].unitScale, 100); assert.deepEqual(result.bindings[0].offset, [30, -20, 0]); assert.deepEqual(result.bindings[0].targetReference, { objectId: '123' }); assert.deepEqual(json, original);
});
test('does not guess missing or ambiguous targets or unverified source units', () => {
 for (const change of [g => { g.nodes[4].name = 'Other'; }, g => { g.nodes[3].children.push(5); g.nodes.push({ name: 'Target' }); }, g => { g.nodes[2].translation = [1, 100, -20]; }]) {
 const json = document(); change(json); const result = bindHaloFollow(json, source); assert.equal(result.bindings.length, 0); assert.equal(result.warnings.length, 1);
 }
 assert.equal(bindHaloFollow(document(), { bindings: [] }).bindings.length, 0);
});
