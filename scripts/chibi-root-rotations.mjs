// Root rotation repair requires an exact hierarchy and matching source rest orientation.
export function restoreStaticMeshTranslations(json, sources, paths, read, append) {
  let repaired = 0;
  for (const source of sources) {
    const nodes = paths.flatMap((path, index) => path === source.hierarchyPath && Number.isInteger(json.nodes[index].mesh)
      && json.nodes[index].skin === undefined ? [index] : []);
    if (!source.sourceReference || nodes.length !== 1 || !source.restTranslation?.every(Number.isFinite)) continue;
    const rest = source.restTranslation, exported = json.nodes[nodes[0]].translation ?? [0, 0, 0];
    const length = rest.reduce((sum, value) => sum + value * value, 0);
    if (length < 1e-12) continue;
    const scale = rest.reduce((sum, value, i) => sum + value * exported[i], 0) / length;
    if (!Number.isFinite(scale) || scale <= 0 || exported.some((value, i) => Math.abs(value - rest[i] * scale) > 1e-7)) continue;
    for (const animation of json.animations ?? []) {
      if (!source.clips.includes(animation.name)) continue;
      for (const channel of animation.channels.filter(channel => channel.target.node === nodes[0] && channel.target.path === 'translation')) {
        const sampler = animation.samplers[channel.sampler];
        if (sampler.interpolation !== undefined && sampler.interpolation !== 'LINEAR') continue;
        const values = read(sampler.output);
        if (!values.length || !values.every(row => row.length === 3 && row.every(value => value === 0))) continue;
        // No source position curve exists; FBX synthesized this zero channel.
        sampler.output = append(values.map(() => [...exported]), 'VEC3', 3);
        repaired++;
      }
    }
  }
  return repaired;
}

export function restoreRootRotations(json, sources, paths, read, append) {
  let repaired = 0;
  const same = (a, b) => Math.abs(a.reduce((sum, value, i) => sum + value * b[i], 0)) > 1 - 1e-6;
  for (const source of sources) {
    const nodes = paths.flatMap((path, index) => path === source.hierarchyPath ? [index] : []);
    const animations = json.animations.filter(clip => clip.name === source.clip);
    if (nodes.length !== 1 || animations.length !== 1 || !same(json.nodes[nodes[0]].rotation ?? [0, 0, 0, 1], source.restRotation)) continue;
    const targetPath = source.targetPath ?? 'rotation';
    let sourceValues = source.values;
    const equal = targetPath === 'rotation' ? same : (a, b) => a.every((value, i) => Math.abs(value - b[i]) < 1e-8);
    if (targetPath === 'scale') {
      const rest = source.restScale, exported = json.nodes[nodes[0]].scale ?? [1, 1, 1];
      if (!rest || rest.some(value => !Number.isFinite(value) || value === 0)) continue;
      const unitScale = exported[0] / rest[0];
      if (!Number.isFinite(unitScale) || unitScale <= 0 || !equal(exported, rest.map(value => value * unitScale))) continue;
      sourceValues = source.values.map(row => row.map(value => value * unitScale));
    }
    if (targetPath === 'translation') {
      const rest = source.restTranslation, exported = json.nodes[nodes[0]].translation ?? [0, 0, 0];
      const lengthSquared = rest.reduce((sum, value) => sum + value * value, 0);
      if (lengthSquared < 1e-12) continue;
      const unitScale = rest.reduce((sum, value, i) => sum + value * exported[i], 0) / lengthSquared;
      if (!Number.isFinite(unitScale) || unitScale <= 0 || !equal(exported, rest.map(value => value * unitScale))) continue;
      sourceValues = source.values.map(row => row.map(value => value * unitScale));
    }
    const animation = animations[0];
    const channels = animation.channels.filter(channel => channel.target.node === nodes[0] && channel.target.path === targetPath);
    if (channels.length !== 1) continue;
    const sampler = animation.samplers[channels[0].sampler];
    if (sampler.interpolation !== undefined && sampler.interpolation !== 'LINEAR') continue;
    const times = read(sampler.input).flat(), values = read(sampler.output);
    if (Math.abs(times.at(-1) - source.times.at(-1)) > 1e-4) continue;
    if (times.every((time, i) => {
      const index = source.times.findIndex(t => Math.abs(t - time) < 1e-6);
      return index >= 0 && equal(values[i], sourceValues[index]);
    })) continue;
    sampler.input = append(source.times.map(time => [time]), 'SCALAR', 1);
    json.accessors[sampler.input].min = [source.times[0]];
    json.accessors[sampler.input].max = [source.times.at(-1)];
    sampler.output = append(sourceValues, targetPath === 'rotation' ? 'VEC4' : 'VEC3', targetPath === 'rotation' ? 4 : 3);
    sampler.interpolation = 'LINEAR';
    repaired += 1;
  }
  return repaired;
}
