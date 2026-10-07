import assert from 'node:assert/strict';
import test from 'node:test';
import { embedAlternateFaceEvents } from './chibi-face-events.mjs';
import { embedRendererActive, embedExCostumePreview } from './chibi-renderer-active.mjs';

test('source activation restores normal/alternate visibility without numeric mapping', () => {
  const f = fixture(2);
  f.config.rendererActive = f.paths.flatMap((hierarchyPath, index) => ['Idle', 'Pickup'].map(clip => ({ clip, hierarchyPath, active: index === 0 })));
  embedRendererActive(f.json, f.config, f.paths);
  const metadata = f.json.scenes[0].extras.chibi;
  assert.deepEqual(metadata.rendererSlots.map(slot => slot.defaultVisible), [true, false]);
  assert.equal(metadata.rendererActivation.sourceVerified, true);
  assert.equal(metadata.rendererEvents.length, 4);
});

test('source activation rejects missing initial state, duplicate paths and existing event mappings', () => {
  for (const mutate of [
    f => f.config.rendererActive.shift(),
    f => f.paths.push(f.paths[0]) && f.json.nodes.push({ mesh: 2 }),
    f => { f.json.scenes[0].extras.chibi.rendererSlots = [{ id: 8, nodeIndices: [0] }]; },
  ]) {
    const f = fixture(2);
    f.config.rendererActive = ['Idle', 'Pickup'].map(clip => ({ clip, hierarchyPath: f.paths[0], active: false }));
    mutate(f);
    embedRendererActive(f.json, f.config, f.paths);
    assert.equal(f.json.scenes[0].extras.chibi.rendererActivation, undefined);
  }
});

test('identical source visibility bindings coalesce but conflicting values remain rejected', () => {
  for (const conflict of [false, true]) {
    const f = fixture(2);
    const track = { clip: 'Idle', hierarchyPath: f.paths[0], active: false };
    f.config.rendererActive = [track, { ...track, active: conflict }];
    embedRendererActive(f.json, f.config, f.paths);
    const metadata = f.json.scenes[0].extras.chibi;
    assert.equal(metadata.rendererSlots.length, conflict ? 0 : 1);
    assert.equal(metadata.rendererEvents.length, conflict ? 0 : 1);
  }
});

test('preserves exact step visibility when unrelated clips have no activation binding', () => {
  const f = fixture(2);
  f.config.rendererActive = [
    { clip: 'Idle', hierarchyPath: f.paths[0], active: true },
    { clip: 'Idle', hierarchyPath: f.paths[1], active: false },
    ...[0, 7, 9].flatMap(time => f.paths.map((hierarchyPath, index) =>
      ({ clip: 'Pickup', hierarchyPath, time, active: time === 7 ? index === 1 : index === 0 }))),
  ];
  f.json.animations.push({ name: 'Camera' });
  embedRendererActive(f.json, f.config, f.paths);
  const metadata = f.json.scenes[0].extras.chibi;
  assert.deepEqual(metadata.rendererSlots.map(slot => slot.defaultVisible), [true, false]);
  assert.equal(metadata.rendererEvents.length, 8);
  assert.deepEqual(metadata.rendererActivation.missingClips.map(track => track.clip), ['Camera', 'Camera']);
  assert.deepEqual(metadata.rendererEvents.filter(event => event.clip === 'Pickup' && event.time === 7)
    .map(event => event.function), ['AniEvt_DisableChildRenderer', 'AniEvt_EnableChildRenderer']);
});

test('EX costume preview requires the exact source pair and leaves other clips at rest visibility', () => {
  for (const mismatch of [false, true]) {
    const json = { scenes: [{ extras: { chibi: { incompleteImport: { warnings: [] } } } }],
      animations: [{ name: 'CH0114_Exs' }, { name: 'Idle' }],
      nodes: ['2894786486314068556', '5812002580710353484'].map((objectId, index) => ({ mesh: index,
        extras: { chibi: { sourceDefaultVisible: index === 0, sourceReference: {
          bundleSha256: '440d6e173c456649e3e7412df86ff584f2ec08ec39642153183b978159b64f56',
          serializedFile: 'CAB-e7b4fe21490a4fb7e8df738810372795', objectId,
        } } } })) };
    if (mismatch) json.nodes[1].extras.chibi.sourceReference.objectId = 'different';
    assert.equal(embedExCostumePreview(json), !mismatch);
    const metadata = json.scenes[0].extras.chibi;
    if (mismatch) continue;
    assert.deepEqual(metadata.rendererSlots.map(slot => slot.defaultVisible), [true, false]);
    assert.deepEqual(metadata.rendererEvents.map(event => [event.clip, event.function]),
      [['CH0114_Exs', 'AniEvt_DisableChildRenderer'], ['CH0114_Exs', 'AniEvt_EnableChildRenderer']]);
    assert.equal(metadata.costumePreview.sourceVerified, false);
  }
});

function fixture(count = 3, firstRank = 0, firstId = 2) {
  const renderers = Array.from({ length: count }, (_, i) => ({
    hierarchyPath: `Cafe_NewStudent/New_Face${i + firstRank || ''}_Outline`,
    sourceReference: { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB', objectId: String(100 - i) },
    eyeMouth: i === 0,
  }));
  const event = (clip, time, int, visible) => ({ clip, time, int, function: `AniEvt_${visible ? 'Enable' : 'Disable'}ChildRenderer` });
  const config = { profile: { initialPose: 'Idle' }, incompleteImport: { renderers },
    alternateFaceEvents: [
      ...renderers.map((_, i) => event('Idle', 0, firstId + i, i === 0)),
      ...renderers.map((_, i) => event('Pickup', .1, firstId + i, i === count - 1)),
      ...renderers.map((_, i) => event('Pickup', 2, firstId + i, i === 0)),
    ] };
  const paths = renderers.map(renderer => renderer.hierarchyPath);
  const json = { scene: 0, scenes: [{ extras: { chibi: { incompleteImport: { warnings: [] } } } }],
    nodes: renderers.map((_, mesh) => ({ mesh })), animations: [{ name: 'Idle' }, { name: 'Pickup' }] };
  return { json, config, paths };
}

test('an unrelated prop ID does not discard a complete initial face group', () => {
  const f = fixture(3);
  f.config.alternateFaceEvents.push({ clip: 'Pickup', time: 0, int: 9, function: 'AniEvt_DisableChildRenderer' });
  const warnings = f.json.scenes[0].extras.chibi.incompleteImport.warnings;
  warnings.push('Selected child-renderer event Pickup at 0 has no exact source renderer-ID binding; BAAD supplied index 9 without a source object reference.');
  assert.equal(embedAlternateFaceEvents(f.json, f.config, f.paths), true);
  const metadata = f.json.scenes[0].extras.chibi;
  assert.deepEqual(metadata.rendererSlots.map(slot => slot.id), [2, 3, 4]);
  assert.equal(metadata.rendererEvents.some(event => event.int === 9), false);
  assert.ok(metadata.incompleteImport.warnings.some(warning => warning.includes('index 9')));
});

test('general face convention supports three variants and two variants without character tables', () => {
  for (const args of [[3, 0, 2], [2, 1, 7]]) {
    const { json, config, paths } = fixture(...args);
    config.incompleteImport.renderers.reverse(); // Serialized object order is irrelevant.
    assert.equal(embedAlternateFaceEvents(json, config, paths), true);
    const result = json.scenes[0].extras.chibi;
    assert.deepEqual(result.rendererSlots.map(slot => slot.nodeIndices[0]), args[0] === 3 ? [0, 1, 2] : [0, 1]);
    assert.deepEqual(result.rendererSlots.map(slot => slot.defaultVisible), args[0] === 3 ? [true, false, false] : [true, false]);
    assert.equal(result.faceSwitching.sourceVerified, false);
    assert.equal(result.rendererEvents.length, args[0] * 3);
  }
});

test('alternate hair events anchor to the idle skin rig rather than names or renderer order', () => {
  const f = fixture(2, 0, 4);
  f.paths = ['Root/HairB', 'Root/HairA'];
  f.config.incompleteImport.renderers.forEach((renderer, index) => {
    Object.assign(renderer, { hierarchyPath: f.paths[index], hairMaterial: true, defaultVisible: true, eyeMouth: false });
    f.json.nodes[index].skin = index;
    f.json.nodes[index].extras = { chibi: { sourceDefaultVisible: true, sourceReference: renderer.sourceReference } };
  });
  f.json.nodes.push(...Array.from({ length: 10 }, () => ({})));
  f.json.skins = [{ joints: [2, 3, 4, 5, 6, 7, 8] }, { joints: [2, 3, 4, 5, 9, 10, 11] }];
  f.json.meshes = [0, 1].map(() => ({ primitives: [{ attributes: { JOINTS_0: 0, WEIGHTS_0: 1 } }] }));
  f.json.animations[0].channels = [6, 7, 8].map(node => ({ target: { node, path: 'rotation' } }));
  const joints = Array.from({ length: 100 }, () => [4, 0, 0, 0]);
  const weights = Array.from({ length: 100 }, () => [1, 0, 0, 0]);
  const read = index => index === 0 ? joints : weights;
  assert.equal(embedAlternateFaceEvents(f.json, f.config, f.paths, read), true);
  const metadata = f.json.scenes[0].extras.chibi;
  assert.deepEqual(metadata.rendererSlots.map(slot => slot.nodeIndices), [[0], [1]]);
  assert.deepEqual(metadata.rendererSlots.map(slot => slot.defaultVisible), [true, false]);
  assert.equal(metadata.hairSwitching.sourceVerified, false);
  assert.equal(metadata.faceSwitching, undefined);
  delete metadata.hairSwitching;
  f.json.animations[0].channels.push({ target: { node: 9, path: 'rotation' } });
  assert.equal(embedAlternateFaceEvents(f.json, f.config, f.paths, read), false);
});

function integratedFixture() {
  const f = fixture(2, 0, 8);
  f.paths[0] = f.config.incompleteImport.renderers[0].hierarchyPath = 'Cafe_NewStudent/New_Body';
  f.config.incompleteImport.renderers[0].defaultVisible = true;
  f.config.incompleteImport.materialSlots = [{ adapterId: 'mx-character-face', sourceMaterialName: 'Face' }];
  f.json.materials = [{ name: 'Face' }, { name: 'Eyes' }];
  f.json.meshes = [{ primitives: [{ material: 0 }, { material: 1 }] }, { primitives: [{ material: 0 }] }];
  f.config.alternateFaceEvents = f.config.alternateFaceEvents.filter(event => event.clip === 'Idle');
  f.config.alternateFaceEvents.push(...f.config.alternateFaceEvents.map(event => ({ ...event, clip: 'Pickup' })));
  return f;
}

test('normal face embedded in a body excludes the separate expression across consistently normal clips', () => {
  const f = integratedFixture();
  assert.equal(embedAlternateFaceEvents(f.json, f.config, f.paths), true);
  const metadata = f.json.scenes[0].extras.chibi;
  assert.deepEqual(metadata.rendererSlots.map(slot => [slot.nodeIndices[0], slot.defaultVisible]), [[0, true], [1, false]]);
  assert.equal(metadata.faceSwitching.method, 'integrated-normal-face-convention-v1');
  assert.equal(metadata.faceSwitching.sourceVerified, false);
});

test('integrated normal face rejects body switching, unrelated overlays, missing starts and competing normal bodies', () => {
  for (const mutate of [
    f => { f.config.alternateFaceEvents.push({ clip: 'Pickup', time: 1, int: 8, function: 'AniEvt_DisableChildRenderer' }); },
    f => { f.json.meshes[1].primitives[0].material = 1; },
    f => { f.config.alternateFaceEvents.pop(); },
    f => { f.config.incompleteImport.renderers.push({ ...f.config.incompleteImport.renderers[0], hierarchyPath: 'Cafe_NewStudent/Other' }); },
    f => { f.config.incompleteImport.renderers[0].defaultVisible = false; },
    f => { f.config.alternateFaceEvents[0].targetReference = f.config.incompleteImport.renderers[1].sourceReference; },
  ]) {
    const f = integratedFixture(); mutate(f);
    assert.equal(embedAlternateFaceEvents(f.json, f.config, f.paths), false);
    assert.equal(f.json.scenes[0].extras.chibi.rendererSlots, undefined);
  }
});

test('normal EyeMouth material anchors the initially enabled ID, independent of face suffix', () => {
  const { json, config, paths } = fixture();
  config.incompleteImport.renderers[0].eyeMouth = false;
  config.incompleteImport.renderers[2].eyeMouth = true;
  assert.equal(embedAlternateFaceEvents(json, config, paths), true);
  assert.deepEqual(json.scenes[0].extras.chibi.rendererSlots.map(slot => slot.nodeIndices[0]), [2, 0, 1]);
});

test('ambiguous groups, extra renderer IDs, overlapping states, and contradictory exact targets remain unmapped', () => {
  for (const mutate of [
    f => { f.config.incompleteImport.renderers[1].eyeMouth = true; },
    f => { f.config.alternateFaceEvents[0].int = 42; },
    f => { f.config.alternateFaceEvents[1].function = 'AniEvt_EnableChildRenderer'; },
    f => { f.paths[1] = f.paths[0]; },
    f => { f.config.alternateFaceEvents[0].targetReference = f.config.incompleteImport.renderers[2].sourceReference; },
  ]) {
    const f = fixture(); mutate(f);
    assert.equal(embedAlternateFaceEvents(f.json, f.config, f.paths), false);
    assert.equal(f.json.scenes[0].extras.chibi.rendererSlots, undefined);
  }
});

test('shared eye material distinguishes mirrored full eyes from a one-eye wink without relying on vertex count alone', () => {
  for (const normalIndex of [0, 2]) {
    const f = fixture(3, 1, 4);
    const winkIndex = normalIndex === 0 ? 2 : 0;
    f.config.incompleteImport.renderers.forEach((face, index) => { face.eyeMouth = index !== 1; });
    f.config.incompleteImport.materialSlots = [{ adapterId: 'mx-character-eyemouth', sourceMaterialName: 'SharedEyes' }];
    f.json.materials = [{ name: 'SharedEyes' }];
    f.json.meshes = f.json.nodes.map((_, index) => ({ primitives: [{ material: 0, attributes: { POSITION: index } }] }));
    const half = [[1, 2, 3], [2, 3, 4], [3, 4, 5]];
    const full = half.flatMap(p => [[p[0] + .001, p[1], p[2]], [-p[0], p[1] + .02, p[2]]]).reverse();
    const read = index => index === normalIndex ? full : half;
    assert.equal(embedAlternateFaceEvents(f.json, f.config, f.paths, read), true);
    assert.equal(f.json.scenes[0].extras.chibi.rendererSlots[0].nodeIndices[0], normalIndex);
    assert.equal(f.json.scenes[0].extras.chibi.rendererSlots.find(slot => slot.nodeIndices[0] === winkIndex).defaultVisible, false);
    for (const broken of [
      [[1, 9, 3], ...half.slice(1)], // Same count, unrelated geometry.
      [[0, 2, 3], ...half.slice(1)], // Not a single-sided eye.
      [...half, half[0]], // Not a full/mirrored pair.
    ]) assert.equal(embedAlternateFaceEvents(f.json, f.config, f.paths, index => index === normalIndex ? full : broken), false);
  }
});
