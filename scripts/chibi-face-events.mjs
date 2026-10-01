// Compatibility rule for the numbered alternate-face convention. This is an
// inference, not a reconstruction of the unavailable Unity callback code.
export function embedAlternateFaceEvents(json, config, paths, readAccessor) {
  const metadata = json.scenes?.[json.scene ?? 0]?.extras?.chibi;
  const events = (config.alternateFaceEvents ?? []).filter(event =>
    (event.function === 'AniEvt_EnableChildRenderer' || event.function === 'AniEvt_DisableChildRenderer')
    && (json.animations ?? []).some(clip => clip.name === event.clip));
  if (!metadata?.incompleteImport || !events.length) return false;
  if (events.some(event => !Number.isInteger(event.int) || event.int < 0 || !Number.isFinite(event.time) || event.time < 0)) return false;
  const ids = [...new Set(events.map(event => event.int))].sort((a, b) => a - b);
  const faces = (config.incompleteImport.renderers ?? []).flatMap(renderer => {
    const match = renderer.hierarchyPath?.match(/^(.*\/[^/]*?Face)_?(\d*)(?:_(?:Mesh|Outline))?$/i);
    if (!match || !renderer.sourceReference) return [];
    const nodes = (json.nodes ?? []).flatMap((node, index) =>
      Number.isInteger(node.mesh) && paths[index] === renderer.hierarchyPath ? [index] : []);
    return [{ ...renderer, group: match[1], rank: Number(match[2] || 0), nodes }];
  }).sort((a, b) => a.rank - b.rank);
  // Some prefabs embed the normal face in the body and provide one separate
  // expression overlay. Only support clips that consistently keep the body on;
  // switching the entire body off would need a different primitive-level rule.
  let integratedNormal = false;
  if (faces.length === 1 && faces[0].rank === 1 && !faces[0].eyeMouth && faces[0].nodes.length === 1 && ids.length === 2) {
    const alternate = faces[0];
    const parent = alternate.hierarchyPath.slice(0, alternate.hierarchyPath.lastIndexOf('/'));
    const candidates = (config.incompleteImport.renderers ?? []).filter(renderer => renderer.eyeMouth && renderer.defaultVisible === true
      && renderer.sourceReference && renderer.hierarchyPath?.slice(0, renderer.hierarchyPath.lastIndexOf('/')) === parent);
    const normal = candidates[0];
    const nodes = normal ? json.nodes.flatMap((node, index) => Number.isInteger(node.mesh) && paths[index] === normal.hierarchyPath ? [index] : []) : [];
    const faceMaterials = new Set((config.incompleteImport.materialSlots ?? []).filter(slot => slot.adapterId === 'mx-character-face').map(slot => slot.sourceMaterialName));
    const overlay = json.meshes?.[json.nodes[alternate.nodes[0]].mesh]?.primitives ?? [];
    const body = nodes.length === 1 ? json.meshes?.[json.nodes[nodes[0]].mesh]?.primitives ?? [] : [];
    const enabled = events.filter(event => event.function === 'AniEvt_EnableChildRenderer');
    const enabledId = enabled[0]?.int;
    const completeStarts = (json.animations ?? []).every(clip => ids.every(id => events.some(event => event.clip === clip.name && event.int === id && event.time <= 1e-4)));
    if (candidates.length === 1 && nodes.length === 1 && overlay.length > 0 && completeStarts
      && overlay.every(primitive => faceMaterials.has(json.materials?.[primitive.material]?.name) && body.some(part => part.material === primitive.material))
      && enabled.length > 0 && events.every(event => (event.function === 'AniEvt_EnableChildRenderer') === (event.int === enabledId))) {
      faces.unshift({ ...normal, group: alternate.group, rank: 0, nodes });
      integratedNormal = true;
    }
  }
  if (faces.length < 2 || faces.length !== ids.length || new Set(faces.map(face => face.group)).size !== 1
    || faces.some((face, i) => face.nodes.length !== 1 || (i > 0 && face.rank !== faces[i - 1].rank + 1))
    || ids.some((id, i) => i > 0 && id !== ids[i - 1] + 1)) return false;
  let normalFaces = faces.filter(face => face.eyeMouth);
  // A wink can share EyeMouth with the normal face. Accept a pair only when
  // the full eye geometry contains the wink's eye plus an opposite-side eye.
  if (normalFaces.length === 2 && readAccessor) {
    const eyeMaterials = new Set((config.incompleteImport.materialSlots ?? [])
      .filter(slot => slot.adapterId === 'mx-character-eyemouth').map(slot => slot.sourceMaterialName));
    const candidates = normalFaces.map(face => {
      const primitives = json.meshes[json.nodes[face.nodes[0]].mesh].primitives
        .filter(primitive => eyeMaterials.has(json.materials[primitive.material]?.name));
      return { face, primitive: primitives.length === 1 ? primitives[0] : null };
    });
    if (candidates.every(candidate => Number.isInteger(candidate.primitive?.attributes?.POSITION))) {
      const eyes = candidates.map(candidate => ({ ...candidate, positions: readAccessor(candidate.primitive.attributes.POSITION) }))
        .sort((a, b) => b.positions.length - a.positions.length);
      const [full, wink] = eyes;
      const scale = Math.max(...full.positions.flat().map(Math.abs));
      const width = Math.max(...full.positions.map(p => p[0])) - Math.min(...full.positions.map(p => p[0]));
      const epsilon = width * .005;
      const side = Math.sign(wink.positions[0]?.[0]);
      // Left/right eyes can have slightly different contours. The preserved
      // wink eye must match within 0.5% of pair width; allow 5% for its counterpart.
      const mirrorTolerance = width * .05;
      const same = (a, b, tolerance) => a.every((value, index) => Math.abs(value - b[index]) <= tolerance);
      const remaining = full.positions.slice();
      if (side && Number.isFinite(scale) && scale > 0 && full.positions.length === wink.positions.length * 2
        && full.primitive.material === wink.primitive.material
        && wink.positions.every(position => position.length === 3 && position.every(Number.isFinite) && position[0] * side > epsilon)
        && wink.positions.every(position => {
          const index = remaining.findIndex(candidate => same(candidate, position, epsilon));
          if (index < 0) return false;
          remaining.splice(index, 1);
          return true;
        }) && remaining.every(position => position[0] * side < -epsilon
          && wink.positions.some(eye => same(position, [-eye[0], eye[1], eye[2]], mirrorTolerance)))
        && wink.positions.every(eye => remaining.some(position => same(position, [-eye[0], eye[1], eye[2]], mirrorTolerance)))) normalFaces = [full.face];
    }
  }
  const initial = new Map();
  for (const event of events) if (event.clip === config.profile?.initialPose && event.time <= 1e-4) {
    initial.set(event.int, event.function === 'AniEvt_EnableChildRenderer');
  }
  const initialEnabled = ids.filter(id => initial.get(id) === true);
  if (normalFaces.length !== 1 || initial.size !== ids.length || initialEnabled.length !== 1) return false;
  const remaining = faces.filter(face => face !== normalFaces[0]);
  const ordered = ids.map(id => id === initialEnabled[0] ? normalFaces[0] : remaining.shift());
  const key = reference => reference && `${reference.bundleSha256}:${reference.serializedFile}:${reference.objectId}`;
  // An explicit source target always wins over a convention. Do not contradict it.
  if (events.some(event => event.targetReference && key(event.targetReference) !== key(ordered[ids.indexOf(event.int)].sourceReference))) return false;
  // Evaluate complete timestamp batches, not individual enable/disable calls.
  // The supported convention must keep exactly one face visible in every clip.
  for (const clip of new Set(events.map(event => event.clip))) {
    const states = new Map(initial);
    const timeline = events.filter(event => event.clip === clip).sort((a, b) => a.time - b.time);
    for (let i = 0; i < timeline.length;) {
      const time = timeline[i].time;
      do {
        const event = timeline[i++];
        states.set(event.int, event.function === 'AniEvt_EnableChildRenderer');
      } while (i < timeline.length && Math.abs(timeline[i].time - time) <= 1e-4);
      if ([...states.values()].filter(Boolean).length !== 1) return false;
    }
  }
  metadata.rendererSlots = ids.map((id, index) => ({
    id, nodeIndices: ordered[index].nodes, defaultVisible: initial.get(id),
    sourceReference: ordered[index].sourceReference,
  }));
  metadata.rendererEvents = events.map(({ clip, time, int, function: fn }) => ({ clip, time, int, function: fn }))
    .sort((a, b) => a.time - b.time);
  metadata.faceSwitching = { method: integratedNormal ? 'integrated-normal-face-convention-v1' : 'alternate-face-convention-v2', sourceVerified: false,
    initialPose: config.profile.initialPose, basis: 'Normal EyeMouth face (paired eye geometry when shared with a wink) anchored to idle; remaining numbered variants follow ascending event IDs.' };
  metadata.incompleteImport.warnings = metadata.incompleteImport.warnings
    .filter(warning => !warning.startsWith('Selected child-renderer event '));
  metadata.incompleteImport.warnings.push('Alternate face switching uses the inferred numbered-face convention; original game callback mapping is not verified.');
  return true;
}
