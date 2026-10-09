// Bind exact source paths after the importer has finalized the GLB hierarchy.
export function removeUnboundHaloTransforms(json, source, paths) {
  let removed = 0;
  for (const record of source.unboundHaloTransforms ?? []) {
    if (!(source.bindings ?? []).some(binding => record.hierarchyPath.startsWith(binding.haloPath + '/'))) continue;
    const nodes = paths.flatMap((path, index) => {
      const node = json.nodes[index], ref = node.extras?.chibi?.sourceRenderer?.sourceReference ?? node.extras?.chibi?.sourceReference;
      return path === record.hierarchyPath && Number.isInteger(node.mesh) && node.skin === undefined
        && ref && ['bundleSha256', 'serializedFile', 'objectId'].every(key => ref[key] === record.sourceReference?.[key]) ? [index] : [];
    });
    if (nodes.length !== 1 || !['translation', 'rotation', 'scale'].includes(record.targetPath)) continue;
    for (const animation of json.animations ?? []) {
      if (!record.clips.includes(animation.name)) continue;
      animation.channels = animation.channels.filter(channel => {
        if (channel.target.node !== nodes[0] || channel.target.path !== record.targetPath) return true;
        // Name-only FBX binding applied a different source path to this child.
        // Keep its prefab rest transform; the verified parent follower positions it.
        removed++;
        return false;
      });
    }
  }
  return removed;
}

export function bindHaloFollow(json, source) {
  const paths = [];
  const visit = (index, parent = '') => {
    const node = json.nodes[index];
    const path = node.name === 'RootNode' ? '' : parent ? `${parent}/${node.name}` : node.name;
    paths[index] = path;
    for (const child of node.children ?? []) visit(child, path);
  };
  for (const node of json.scenes[json.scene ?? 0].nodes) visit(node);
  const bindings = [], warnings = [...(source.warnings ?? [])];
  for (const binding of source.bindings ?? []) {
    const halos = paths.flatMap((path, index) => path === binding.haloPath ? [index] : []);
    const targets = paths.flatMap((path, index) => path === binding.targetPath ? [index] : []);
    if (halos.length !== 1 || targets.length !== 1 || halos[0] === targets[0]
      || bindings.some(item => item.haloNodeIndex === halos[0])) {
      warnings.push(`Halo follow ${binding.haloPath}: no unique exported source binding.`);
      continue;
    }
    const rest = binding.haloRestPosition, actual = json.nodes[halos[0]].translation ?? [0, 0, 0];
    const length = rest.reduce((sum, value) => sum + value * value, 0);
    const scale = length > 1e-12 ? rest.reduce((sum, value, i) => sum + value * actual[i], 0) / length : NaN;
    if (!Number.isFinite(scale) || scale <= 0 || actual.some((value, i) => Math.abs(value - rest[i] * scale) > 1e-6)) {
      warnings.push(`Halo follow ${binding.haloPath}: source translation units are unverified.`);
      continue;
    }
    bindings.push({ ...binding, haloNodeIndex: halos[0], targetNodeIndex: targets[0],
      offset: binding.offset.map(value => value * scale),
      clampMin: binding.clampMin.map(value => value * scale),
      clampMax: binding.clampMax.map(value => value * scale), unitScale: scale });
  }
  return { schemaVersion: 1, bindings, warnings };
}
