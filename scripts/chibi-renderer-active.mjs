// Exact constant activation tracks take precedence over prefab rest visibility.
export function embedRendererActive(json, config, paths) {
  const metadata = json.scenes?.[json.scene ?? 0]?.extras?.chibi;
  if (!metadata || !config.rendererActive?.length) return;
  const clips = (json.animations ?? []).map(clip => clip.name);
  const slots = metadata.rendererSlots ??= [];
  const events = metadata.rendererEvents ??= [];
  for (const path of new Set(config.rendererActive.map(track => track.hierarchyPath))) {
    const nodes = json.nodes.flatMap((node, index) => Number.isInteger(node.mesh) && paths[index] === path ? [index] : []);
    const tracks = config.rendererActive.filter(track => track.hierarchyPath === path && clips.includes(track.clip))
      .filter((track, index, all) => all.findIndex(other => other.clip === track.clip
        && (other.time ?? 0) === (track.time ?? 0) && other.active === track.active) === index);
    if (nodes.length !== 1 || tracks.some(track => typeof track.active !== 'boolean'
      || !Number.isFinite(track.time ?? 0) || (track.time ?? 0) < 0)
      || slots.some(slot => slot.nodeIndices?.includes(nodes[0]))) continue;
    const timelines = [...new Set(tracks.map(track => track.clip))].map(clip =>
      tracks.filter(track => track.clip === clip).sort((a, b) => (a.time ?? 0) - (b.time ?? 0)));
    if (timelines.some(timeline => (timeline[0].time ?? 0) !== 0
      || new Set(timeline.map(track => track.time ?? 0)).size !== timeline.length)) continue;
    const initial = tracks.find(track => track.clip === config.profile?.initialPose && (track.time ?? 0) === 0);
    if (!initial) continue;
    if (metadata.renderingProfile) {
      const renderer = metadata.renderingProfile.renderers.find(renderer => renderer.hierarchyPath === path);
      if (!renderer || !clips.every(clip => tracks.some(track => track.clip === clip))
        || tracks.some(track => track.active !== initial.active)
        || metadata.renderingProfile.childRendererEvents?.length) continue;
      renderer.defaultVisible = initial.active;
    }
    const id = Math.max(-1, ...slots.map(slot => slot.id)) + 1;
    slots.push({ id, nodeIndices: nodes, defaultVisible: initial.active });
    events.push(...tracks.map(track => ({ clip: track.clip, time: track.time ?? 0, int: id,
      function: `AniEvt_${track.active ? 'Enable' : 'Disable'}ChildRenderer` })));
    metadata.rendererActivation ??= { method: 'source-step-visibility-v3', sourceVerified: true, paths: [], missingClips: [] };
    metadata.rendererActivation.paths.push(path);
    metadata.rendererActivation.missingClips.push(...clips.filter(clip => !tracks.some(track => track.clip === clip))
      .map(clip => ({ hierarchyPath: path, clip })));
  }
}

// Requested EX costume preview, separate from unresolved numeric callbacks.
// Pin both source objects so a different prefab cannot inherit this choice.
export function embedExCostumePreview(json) {
  const metadata = json.scenes?.[json.scene ?? 0]?.extras?.chibi;
  if (!metadata?.incompleteImport || !(json.animations ?? []).some(clip => clip.name === 'CH0114_Exs')) return false;
  const objects = ['2894786486314068556', '5812002580710353484'].map(objectId =>
    (json.nodes ?? []).flatMap((node, index) => {
      const ref = node.extras?.chibi?.sourceReference;
      return Number.isInteger(node.mesh) && ref?.bundleSha256 === '440d6e173c456649e3e7412df86ff584f2ec08ec39642153183b978159b64f56'
        && ref.serializedFile === 'CAB-e7b4fe21490a4fb7e8df738810372795' && ref.objectId === objectId ? [index] : [];
    }));
  const slots = metadata.rendererSlots ??= [];
  if (objects.some(nodes => nodes.length !== 1 || slots.some(slot => slot.nodeIndices?.includes(nodes[0])))) return false;
  if (objects.some((nodes, index) => json.nodes[nodes[0]].extras.chibi.sourceDefaultVisible !== (index === 0))) return false;
  const events = metadata.rendererEvents ??= [];
  for (const [index, nodes] of objects.entries()) {
    const id = Math.max(-1, ...slots.map(slot => slot.id)) + 1;
    slots.push({ id, nodeIndices: nodes, defaultVisible: json.nodes[nodes[0]].extras.chibi.sourceDefaultVisible });
    events.push({ clip: 'CH0114_Exs', time: 0, int: id,
      function: `AniEvt_${index === 1 ? 'Enable' : 'Disable'}ChildRenderer` });
  }
  metadata.costumePreview = { clip: 'CH0114_Exs', sourceVerified: false,
    basis: 'Requested tree-suit preview using exact source costume/body objects; game form-change timing is unresolved.' };
  return true;
}
