import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyIncompleteMaterials } from './chibi-incomplete-materials.mjs';

test('fallback binds the exact lowercase vehicle texture and rejects a different material identity', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'chibi-vehicle-'));
  try {
    const texturePath = path.join(folder, 'fixture.png'); fs.writeFileSync(texturePath, 'fixture');
    for (const different of [false, true]) {
      const sourceMaterialReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB', objectId: '1' };
      const slot = { sourceMaterialName: 'Vehicle', sourceMaterialReference, sourceShaderParsedName: 'ProjectMX/WeaponTest1Damage' };
      const json = { materials: [{ name: 'Vehicle' }], scenes: [{}] };
      applyIncompleteMaterials(json, { incompleteImport: { warnings: [], materialSlots: [slot] }, sourceTextureExports: [{
        sourceMaterialName: 'Vehicle', sourceMaterialReference: { ...sourceMaterialReference, objectId: different ? '2' : '1' },
        textureProperty: '_mainTex', path: texturePath,
      }] }, () => 0, []);
      assert.equal(!!json.materials[0].pbrMetallicRoughness?.baseColorTexture, !different);
    }
  } finally { fs.rmSync(folder, { recursive: true }); }
});

test('fan reverse-face preview override is scoped to its exact source material', () => {
  const reference = { bundleSha256: '375d16e823615ca18e08ada1abc9550890a4e30b58fc05e60e63005ab9740dc8',
    serializedFile: 'CAB-e8051bb32f3c20ea4b804aa6613978c9', objectId: '1024908930424722841' };
  for (const different of [false, true]) {
    const json = { materials: [{ name: 'Fan' }], scenes: [{}] };
    applyIncompleteMaterials(json, { incompleteImport: { warnings: [], materialSlots: [{ sourceMaterialName: 'Fan',
      sourceMaterialReference: { ...reference, objectId: different ? '1' : reference.objectId },
      renderState: { alphaMode: 'OPAQUE', depthTest: true, depthWrite: true, doubleSided: false },
    }] } }, () => 0, []);
    assert.equal(json.materials[0].doubleSided, !different);
  }
});

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

test('retains excluded presentation geometry but records exact hidden visibility', () => {
  const sourceReference = { serializedFile: 'CAB-source', objectId: '2', bundleSha256: 'a'.repeat(64) };
  const renderer = { hierarchyPath: 'Cafe/plane', sourceReference, defaultVisible: false };
  for (const [renderers, expected] of [[[renderer], false], [[renderer, renderer], undefined]]) {
    const json = { nodes: [{ name: 'plane', mesh: 0 }], scenes: [{}] };
    applyIncompleteMaterials(json, { incompleteImport: { warnings: [], materialSlots: [], renderers } }, () => 0, ['Cafe/plane']);
    assert.equal(json.nodes[0].mesh, 0);
    assert.equal(json.nodes[0].extras?.chibi?.sourceDefaultVisible, expected);
  }
});

test('source transparent lenses retain tint and draw over late eye cutouts', () => {
  for (const shader of ['MX/C-General/Transparent', 'MX/C-Simple-Transparent', 'Unknown/Transparent']) {
    const slot = { sourceMaterialName: 'Alpha', sourceMaterialReference: { objectId: '3' },
      adapterId: 'mx-character-general', sourceShaderParsedName: shader,
      adapterSettings: { baseColorTint: [0.8, 0.7, 0.6, 0.5] },
      renderState: { alphaMode: 'BLEND', depthTest: true, depthWrite: false } };
    const json = { materials: [{ name: 'Alpha', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] } }],
      meshes: [{ primitives: [{ material: 0, attributes: { POSITION: 0, COLOR_0: 1 } }] }], scenes: [{}] };
    applyIncompleteMaterials(json, { incompleteImport: { warnings: [], materialSlots: [slot] } }, () => 0, []);
    const supported = shader !== 'Unknown/Transparent';
    assert.deepEqual(json.materials[0].pbrMetallicRoughness.baseColorFactor, supported ? [0.8, 0.7, 0.6, 0.5] : [1, 1, 1, 1]);
    assert.equal(json.materials[0].extras.chibi.renderOrder, supported ? 10000 : undefined);
    assert.equal(json.meshes[0].primitives[0].attributes.COLOR_0, supported ? undefined : 1);
  }
});

test('Hikari ticket draws after eyes and mouth without disabling depth testing', () => {
  const slot = { sourceMaterialName: 'CH0242_Ticket',
    sourceMaterialReference: { bundleSha256: '5eef89fd33fddad9c513724dd61d721bb18a2414969430f2033d53fe162ec36e',
      serializedFile: 'CAB-ec3f013ac889150fd434cf318e28ac83', objectId: '1896634472648111796' },
    adapterId: 'mx-character-general', sourceShaderParsedName: 'MX/C-Simple-Transparent',
    adapterSettings: { baseColorTint: [1, 1, 1, 1] },
    renderState: { alphaMode: 'BLEND', depthTest: true, depthWrite: false, doubleSided: false } };
  const json = { materials: [{ name: 'CH0242_EyeMouth', extras: { chibi: { renderOrder: 20 } } },
    { name: 'ch0242_Mouth' }, { name: 'CH0242_Ticket' }], scenes: [{}] };
  applyIncompleteMaterials(json, { incompleteImport: { warnings: [], materialSlots: [slot] } }, () => 0, []);
  const ticket = json.materials[2];
  assert.ok(ticket.extras.chibi.renderOrder > json.materials[0].extras.chibi.renderOrder);
  assert.equal(ticket.extras.chibi.depthTest, true);
  assert.equal(ticket.extras.chibi.depthWrite, false);
  assert.equal(ticket.alphaMode, 'BLEND');
});
