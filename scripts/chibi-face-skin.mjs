// Restore source weights only when every exported vertex has an unambiguous
// source correspondence. FBX uses centimetres and reflects Unity's X axis.
export function repairFaceSkin(json, sources, paths, read, append) {
  let repaired = 0;
  for (const source of sources) {
    const nodes = json.nodes.filter((node, index) => paths[index] === source.hierarchyPath && Number.isInteger(node.skin));
    if (nodes.length !== 1) throw new Error(`Face skin node is ambiguous: ${source.hierarchyPath}`);
    const node = nodes[0], skin = json.skins[node.skin];
    const bones = source.bones.map(name => {
      const matches = skin.joints.flatMap((joint, index) => json.nodes[joint].name === name ? [index] : []);
      return matches.length === 1 ? matches[0] : -1;
    });
    const expected = source.positions.map((position, index) => {
      const weights = Array.from({ length: 4 }, (_, i) => source.weights[index][i] ?? 0);
      const joints = weights.map((weight, component) => weight > 0 ? bones[source.joints[index][component]] : 0);
      if (source.weights[index].length > 4 || weights.some(w => !Number.isFinite(w) || w < 0)
        || Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 1e-4 || joints.some(j => !Number.isInteger(j) || j < 0)) {
        throw new Error(`Invalid source face weights: ${source.hierarchyPath} vertex ${index} (${joints}; ${weights})`);
      }
      return { position: position.map((v, axis) => v * .01 * (axis === 0 ? -1 : 1)), joints, weights,
        uv: source.uvs?.[index]?.map((v, axis) => axis === 1 ? 1 - v : v),
        normal: source.normals?.[index]?.slice(0, 3).map((v, axis) => axis === 0 ? -v : v) };
    });
    const signature = row => row.joints.map((joint, i) => [joint, row.weights[i]]).filter(([, w]) => w > 0).sort((a, b) => a[0] - b[0]);
    const sameWeights = (a, b) => {
      const left = signature(a), right = signature(b);
      return left.length === right.length && left.every(([joint, weight], i) => joint === right[i][0] && Math.abs(weight - right[i][1]) < 1e-6);
    };
    const updates = [];
    for (const primitive of json.meshes[node.mesh].primitives) {
      const positions = read(primitive.attributes.POSITION), oldJoints = read(primitive.attributes.JOINTS_0), oldWeights = read(primitive.attributes.WEIGHTS_0);
      const uvs = Number.isInteger(primitive.attributes.TEXCOORD_0) ? read(primitive.attributes.TEXCOORD_0) : null;
      const normals = Number.isInteger(primitive.attributes.NORMAL) ? read(primitive.attributes.NORMAL) : null;
      const rows = positions.map((position, index) => {
        let matches = expected.filter(row => row.position.every((value, axis) => Math.abs(value - position[axis]) < 1e-8));
        // Split vertices can share a position while belonging to different
        // surfaces. Use exporter-preserved UVs/normals only to resolve those
        // conflicting weights; already unambiguous matches stay unchanged.
        if (matches.some(row => !sameWeights(row, matches[0])) && uvs && source.uvs) {
          matches = matches.filter(row => row.uv?.every((value, axis) => Math.abs(value - uvs[index][axis]) < 1e-6));
        }
        if (matches.some(row => !sameWeights(row, matches[0])) && normals && source.normals) {
          matches = matches.filter(row => row.normal?.every((value, axis) => Math.abs(value - normals[index][axis]) < 1e-5));
        }
        if (!matches.length || matches.some(row => !sameWeights(row, matches[0]))) throw new Error(`Ambiguous face skin vertex: ${source.hierarchyPath}`);
        return matches[0];
      });
      const changes = rows.filter((row, i) => !sameWeights(row, { joints: oldJoints[i], weights: oldWeights[i] })).length;
      if (changes) updates.push({ primitive, rows, changes });
    }
    for (const { primitive, rows, changes } of updates) {
      primitive.attributes = { ...primitive.attributes,
        JOINTS_0: append(rows.map(row => row.joints), true),
        WEIGHTS_0: append(rows.map(row => row.weights), false) };
      repaired += changes;
    }
  }
  return repaired;
}
