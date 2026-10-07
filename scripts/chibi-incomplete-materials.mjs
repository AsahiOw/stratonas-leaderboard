import fs from 'node:fs';

// An incomplete import is explicitly not a source-parity claim. Preserve the
// exporter geometry and apply only unambiguous, resolved material information.
export function applyIncompleteMaterials(json, config, appendView, nodePaths) {
  const warnings = [...config.incompleteImport.warnings];
  const slots = config.incompleteImport.materialSlots;
  // FBX can synthesize geometry for a Unity renderer with no mesh or material.
  // Retain other incomplete geometry; omit only uniquely bound exact nulls.
  const sourceRenderers = config.incompleteImport.sourceRenderers ?? [];
  for (const renderer of sourceRenderers) {
    const owner = renderer.sourceReference?.serializedFile;
    const isNull = pointer => owner && pointer?.file === owner && pointer.pathId === '0'
      && !pointer.externalGuid && !pointer.builtinResource;
    if (!renderer.sourceReference || renderer.meshSourceReference || !isNull(renderer.mesh)
      || !(renderer.materialSlots ?? []).every(slot => !slot.sourceMaterialReference && isNull(slot.material))
      || !renderer.hierarchyPath || sourceRenderers.filter(item => item.hierarchyPath === renderer.hierarchyPath).length !== 1) continue;
    const matches = (json.nodes ?? []).filter((node, index) => Number.isInteger(node.mesh) && nodePaths[index] === renderer.hierarchyPath);
    if (matches.length !== 1) continue;
    delete matches[0].mesh;
    warnings.push(`Omitted ${renderer.hierarchyPath}: source mesh and material pointers are exact nulls.`);
  }
  json.images ??= [];
  json.textures ??= [];
  for (const renderer of config.incompleteImport.renderers ?? []) {
    const matches = (json.nodes ?? []).filter((node, index) => Number.isInteger(node.mesh) && nodePaths[index] === renderer.hierarchyPath);
    if (!renderer.sourceReference || !renderer.hierarchyPath || matches.length !== 1 || typeof renderer.defaultVisible !== 'boolean'
      || config.incompleteImport.renderers.filter(item => item.hierarchyPath === renderer.hierarchyPath).length !== 1) {
      warnings.push(`Renderer ${renderer.hierarchyPath} retains exported visibility; no unique source hierarchy binding.`);
      continue;
    }
    const node = matches[0];
    node.extras = { ...node.extras, chibi: { ...node.extras?.chibi,
      sourceDefaultVisible: renderer.defaultVisible, sourceReference: renderer.sourceReference,
    } };
  }
  for (const [index, material] of (json.materials ?? []).entries()) {
    const matches = slots.filter(slot => slot.sourceMaterialName === material.name);
    const identities = new Set(matches.map(slot => JSON.stringify(slot.sourceMaterialReference)));
    if (!matches.length || !matches[0].sourceMaterialReference || identities.size !== 1) {
      warnings.push(`Material ${material.name} retains exported appearance; no unique source material binding.`);
      continue;
    }
    const slot = matches[0];
    // Preserve the resolved face adapter even when unrelated source evidence
    // is incomplete, so the shared postprocess can neutralize mask RGB.
    if (slot.adapterId === 'mx-character-face'
      && /^(?:mx\/c-face(?:\/|$)|mxcharacterface)/i.test(slot.sourceShaderParsedName || slot.sourceShaderName || '')) {
      material.extras = { ...material.extras, chibi: { ...material.extras?.chibi, adapterId: slot.adapterId } };
    }
    const textureProperty = slot.sourceShaderParsedName === 'ProjectMX/WeaponTest1Damage' ? '_mainTex' : '_MainTex';
    const textures = (config.sourceTextureExports ?? []).filter(binding => binding.sourceMaterialName === material.name
      && ['bundleSha256', 'serializedFile', 'objectId'].every(key => binding.sourceMaterialReference?.[key] === slot.sourceMaterialReference[key])
      && binding.textureProperty === textureProperty);
    if (textures.length === 1) {
      const image = json.images.push({ mimeType: 'image/png', bufferView: appendView(fs.readFileSync(textures[0].path)) }) - 1;
      const texture = json.textures.push({ source: image }) - 1;
      material.pbrMetallicRoughness ??= {};
      material.pbrMetallicRoughness.baseColorTexture = { index: texture };
    }
    const state = slot.renderState;
    if (state?.alphaMode && typeof state.depthTest === 'boolean' && typeof state.depthWrite === 'boolean') {
      material.alphaMode = state.alphaMode;
      if (state.alphaMode !== 'MASK') delete material.alphaCutoff;
      material.doubleSided = state.doubleSided ?? false;
      material.extras = { ...material.extras, chibi: {
        ...material.extras?.chibi, depthTest: state.depthTest, depthWrite: state.depthWrite,
        polygonOffsetFactor: state.polygonOffsetFactor ?? 0, polygonOffsetUnits: state.polygonOffsetUnits ?? 0,
      } };
    }
    // The requested fan preview uses the same surface on its reverse face.
    if (slot.sourceMaterialReference.bundleSha256 === '375d16e823615ca18e08ada1abc9550890a4e30b58fc05e60e63005ab9740dc8'
      && slot.sourceMaterialReference.serializedFile === 'CAB-e8051bb32f3c20ea4b804aa6613978c9'
      && slot.sourceMaterialReference.objectId === '1024908930424722841') {
      material.doubleSided = true;
      material.extras = { ...material.extras, chibi: { ...material.extras?.chibi, previewTwoSided: true } };
    }
    // MX/C-Hair shaders ignore vertex RGB and use alpha only for rim lighting.
    // The unlit fallback keeps texture color/alpha without that lighting mask.
    const hairLightingMask = slot.adapterId === 'mx-character-hair'
      && ['mx/c-hair', 'mx/c-hair-transparent'].includes((slot.sourceShaderParsedName || slot.sourceShaderName || '').toLowerCase());
    // Layer4 likewise uses only vertex alpha for rim lighting; its RGB is not
    // a surface tint. Standard GLB vertex-color multiplication creates stains.
    const bodyLightingMask = slot.adapterId === 'mx-character-general'
      && (slot.sourceShaderParsedName || slot.sourceShaderName || '').toLowerCase() === 'mx/c-general/layer4';
    // These transparent shaders output texture/tint alpha; vertex alpha controls
    // rim lighting. glTF would multiply both and erase zero-mask fabric.
    const transparentRimMask = slot.adapterId === 'mx-character-general'
      && ['mx/c-simple-transparent', 'mx/c-general/transparent'].includes((slot.sourceShaderParsedName || slot.sourceShaderName || '').toLowerCase());
    if (transparentRimMask && state?.alphaMode === 'BLEND'
      && typeof state.depthTest === 'boolean' && typeof state.depthWrite === 'boolean') {
      const tint = slot.adapterSettings?.baseColorTint;
      if (Array.isArray(tint) && tint.length === 4 && tint.every(Number.isFinite)) {
        material.pbrMetallicRoughness ??= {};
        material.pbrMetallicRoughness.baseColorFactor = [...tint];
      }
      // Draw transparent surfaces over the late EyeMouth cutout layer.
      material.extras.chibi.renderOrder = 10000;
    }
    if (slot.adapterId === 'mx-character-eyemouth' || hairLightingMask || bodyLightingMask || transparentRimMask) {
      for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
        if (primitive.material === index) delete primitive.attributes.COLOR_0;
      }
    }
  }
  const scene = json.scenes[json.scene ?? 0];
  scene.extras ??= {};
  scene.extras.chibi ??= {};
  // Drop stale mappings. The separate alternate-face pass may build a new,
  // explicitly inferred mapping after checking its supported convention.
  delete scene.extras.chibi.rendererSlots;
  delete scene.extras.chibi.rendererEvents;
  scene.extras.chibi.incompleteImport = { sourceComplete: false, warnings: [...new Set(warnings)] };
}
