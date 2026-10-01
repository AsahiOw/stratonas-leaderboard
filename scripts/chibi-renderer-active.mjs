// Exact constant activation tracks take precedence over prefab rest visibility.
export function embedRendererActive(json, config, paths) {
  const metadata = json.scenes?.[json.scene ?? 0]?.extras?.chibi;
  if (!metadata || !config.rendererActive?.length) return;
  const clips = (json.animations ?? []).map(clip => clip.name);
  const slots = metadata.rendererSlots ??= [];
  const events = metadata.rendererEvents ??= [];
  for (const path of new Set(config.rendererActive.map(track => track.hierarchyPath))) {
    const nodes = json.nodes.flatMap((node, index) => Number.isInteger(node.mesh) && paths[index] === path ? [index] : []);
    const tracks = config.rendererActive.filter(track => track.hierarchyPath === path && clips.includes(track.clip));
    if (nodes.length !== 1 || !clips.every(clip => tracks.filter(track => track.clip === clip).length === 1)
      || tracks.some(track => typeof track.active !== 'boolean')
      || slots.some(slot => slot.nodeIndices?.includes(nodes[0]))) continue;
    const initial = tracks.find(track => track.clip === config.profile?.initialPose);
    if (!initial) continue;
    if (metadata.renderingProfile) {
      const renderer = metadata.renderingProfile.renderers.find(renderer => renderer.hierarchyPath === path);
      if (!renderer || tracks.some(track => track.active !== initial.active)
        || metadata.renderingProfile.childRendererEvents?.length) continue;
      renderer.defaultVisible = initial.active;
    }
    const id = Math.max(-1, ...slots.map(slot => slot.id)) + 1;
    slots.push({ id, nodeIndices: nodes, defaultVisible: initial.active });
    events.push(...tracks.map(track => ({ clip: track.clip, time: 0, int: id,
      function: `AniEvt_${track.active ? 'Enable' : 'Disable'}ChildRenderer` })));
    metadata.rendererActivation ??= { method: 'source-constant-visibility-v2', sourceVerified: true, paths: [] };
    metadata.rendererActivation.paths.push(path);
  }
}
