// Choose an initial hair variant only when the selected animations distinguish
// two source-backed hair skins. This does not resolve numeric renderer events.
export function inferInactiveAlternateHair(json, renderers, paths, selectedClips, readAccessor) {
  const clips = [...new Set(selectedClips ?? [])];
  if (!clips.length) return [];
  const animations = clips.map(name => json.animations?.find(animation => animation.name === name));
  if (animations.some(animation => !animation)) return [];
  const targets = animations.map(animation => new Set(animation.channels
    .filter(channel => ['rotation', 'translation', 'scale'].includes(channel.target?.path))
    .map(channel => channel.target.node)));
  const groups = new Map();
  for (const renderer of renderers ?? []) {
    if (!renderer.sourceReference || !renderer.hairMaterial || renderer.defaultVisible !== true || !renderer.hierarchyPath) continue;
    const parent = renderer.hierarchyPath.slice(0, renderer.hierarchyPath.lastIndexOf('/'));
    const group = groups.get(parent) ?? [];
    group.push(renderer);
    groups.set(parent, group);
  }
  const inferred = [];
  for (const group of groups.values()) {
    if (group.length !== 2) continue;
    const pair = group.map(renderer => {
      const matches = json.nodes.flatMap((node, index) => paths[index] === renderer.hierarchyPath && Number.isInteger(node.mesh) && Number.isInteger(node.skin) ? [index] : []);
      if (matches.length !== 1) return null;
      const node = json.nodes[matches[0]], skin = json.skins?.[node.skin];
      if (node.extras?.chibi?.sourceDefaultVisible !== true
        || JSON.stringify(node.extras.chibi.sourceReference) !== JSON.stringify(renderer.sourceReference)) return null;
      return skin?.joints?.length ? { renderer, node, skin } : null;
    });
    if (pair.some(value => !value)) continue;
    const [first, second] = pair;
    const firstJoints = new Set(first.skin.joints), secondJoints = new Set(second.skin.joints);
    if ([...firstJoints].filter(joint => secondJoints.has(joint)).length < 4) continue;
    const choices = [[first, second, firstJoints, secondJoints], [second, first, secondJoints, firstJoints]];
    for (const [inactive, active, inactiveJoints, activeJoints] of choices) {
      const inactiveUnique = new Set([...inactiveJoints].filter(joint => !activeJoints.has(joint)));
      const activeUnique = [...activeJoints].filter(joint => !inactiveJoints.has(joint));
      if (inactiveUnique.size < 3 || activeUnique.length < 3
        || targets.some(target => [...inactiveUnique].some(joint => target.has(joint))
          || activeUnique.filter(joint => target.has(joint)).length < 3)) continue;
      const inactiveSlots = new Set(inactive.skin.joints.flatMap((joint, index) => inactiveUnique.has(joint) ? [index] : []));
      let vertices = 0, influenced = 0, valid = true;
      for (const primitive of json.meshes[inactive.node.mesh]?.primitives ?? []) {
        const jointIndex = primitive.attributes?.JOINTS_0, weightIndex = primitive.attributes?.WEIGHTS_0;
        if (!Number.isInteger(jointIndex) || !Number.isInteger(weightIndex)) { valid = false; break; }
        let joints, weights;
        try { joints = readAccessor(jointIndex); weights = readAccessor(weightIndex); }
        catch { valid = false; break; }
        if (joints.length !== weights.length) { valid = false; break; }
        vertices += joints.length;
        influenced += joints.filter((row, index) => row.some((joint, component) => inactiveSlots.has(joint) && weights[index][component] > 1e-4)).length;
      }
      if (!valid || vertices < 100 || influenced / vertices < 0.25) continue;
      inferred.push({ hierarchyPath: inactive.renderer.hierarchyPath, vertices, influenced });
      break;
    }
  }
  return inferred;
}
