// Bind exact source paths after the importer has finalized the GLB hierarchy.
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
