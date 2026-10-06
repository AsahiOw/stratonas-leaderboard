import assert from 'node:assert/strict';
import test from 'node:test';
import { applyIncompleteMaterials } from './chibi-incomplete-materials.mjs';

test('omits uniquely bound null source helpers without dropping real or ambiguous geometry', () => {
  const sourceReference = { serializedFile: 'CAB-source', objectId: '1', bundleSha256: 'a'.repeat(64) };
  const helper = { hierarchyPath: 'Cafe_Asuna_Original/Box001', sourceReference,
    mesh: { file: 'CAB-source', pathId: '0' }, materialSlots: [{ material: { file: 'CAB-source', pathId: '0' } }] };
  for (const [sourceRenderers, removed] of [
    [[helper], true],
    [[{ ...helper, mesh: { ...helper.mesh, pathId: '2' } }], false],
    [[{ ...helper, mesh: { ...helper.mesh, externalGuid: 'external' } }], false],
    [[{ ...helper, materialSlots: [{ material: { file: 'CAB-source', pathId: '3' } }] }], false],
    [[helper, helper], false],
  ]) {
    const json = { nodes: [{ name: 'Box001', mesh: 0 }], scenes: [{}], animations: [{ name: 'Idle' }] };
    applyIncompleteMaterials(json, { incompleteImport: { warnings: [], materialSlots: [], sourceRenderers } }, () => 0, [helper.hierarchyPath]);
    assert.equal(json.nodes[0].mesh === undefined, removed);
    assert.equal(json.animations.length, 1);
  }
});
