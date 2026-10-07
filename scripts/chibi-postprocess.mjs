import { bindHaloFollow } from './chibi-halo-follow.mjs';
import { applyIncompleteMaterials } from './chibi-incomplete-materials.mjs';
import { embedAlternateFaceEvents } from './chibi-face-events.mjs';
import { restoreRootRotations, restoreStaticMeshTranslations } from './chibi-root-rotations.mjs';
import { embedRendererActive, embedExCostumePreview } from './chibi-renderer-active.mjs';
import { repairFaceSkin } from './chibi-face-skin.mjs';
import { inferInactiveAlternateHair } from './chibi-alternate-hair.mjs';
import fs from "node:fs";

const [, , inputPath, outputPath, configPath] = process.argv;

if (!inputPath || !outputPath || !configPath) {
  throw new Error("Usage: node scripts/chibi-postprocess.mjs <input.glb> <output.glb> <config.json|Character_Mouth.png>");
}

const legacyHaruna = !configPath.toLowerCase().endsWith('.json');
const config = legacyHaruna ? {
  sourceIdentity: 'haruna_original', mouthTexturePath: configPath,
  removeMeshes: ['Haruna_Original_Fishshapedbun_Weapon', 'Haruna_Original_Orangebox', 'Haruna_Original_Weapon'],
  animations: ['Haruna_Original_Cafe_Idle', 'Haruna_Original_Cafe_Walk', 'Haruna_Original_Formation_Pickup', 'Haruna_Original_Cafe_Reaction'],
} : JSON.parse(fs.readFileSync(configPath, 'utf8'));
const hasExplicitAnimationSelection = Array.isArray(config.animations) || Array.isArray(config.exportClips);
const wantedAnimations = config.animations ?? config.exportClips ?? Object.values(config.profile?.interactions ?? {})
  .filter(interaction => interaction.state === 'available' && interaction.clip)
  .map(interaction => interaction.clip);

// Unity's built-in Quad is an external PPtr rather than a Mesh object in the
// character bundle.  Keep the identity typed and fail closed: only this exact
// GUID/file/pathId tuple is synthesized.  In particular, a name such as
// "Quad", a pathId of 0, or an exporter slot/order cannot select this mesh.
const UNITY_BUILTIN_RESOURCES_GUID = '00000000000000000e00000000000000';
const UNITY_BUILTIN_RESOURCES_FILE = 'unity default resources';
const UNITY_BUILTIN_QUAD_PATH_ID = '10210';
const UNITY_BUILTIN_QUAD_NAME = 'Quad';

const glb = fs.readFileSync(inputPath);
if (glb.readUInt32LE(0) !== 0x46546c67 || glb.readUInt32LE(4) !== 2) {
  throw new Error("Input is not a glTF 2.0 binary file");
}

const jsonLength = glb.readUInt32LE(12);
const json = JSON.parse(
  glb.subarray(20, 20 + jsonLength).toString("utf8").replace(/[\u0000 ]+$/, ""),
);
const binOffset = 20 + jsonLength;
const binLength = glb.readUInt32LE(binOffset);
let bin = glb.subarray(binOffset + 8, binOffset + 8 + binLength);

const SKIN_SKELETON_METADATA_VERSION = 'chibi-skin-skeleton-lca-v1';
function embedSkinSkeletonDiagnostics(repairs) {
  const scene = json.scenes?.[Number.isInteger(json.scene) ? json.scene : 0];
  const diagnostics = scene?.extras?.chibi?.renderingProfileDiagnostics;
  if (diagnostics) {
    diagnostics.skinSkeletonMetadataVersion = SKIN_SKELETON_METADATA_VERSION;
    diagnostics.skinSkeletonRepairs = repairs;
  }
}
function repairNonAncestorSkinSkeletons() {
  if (json.skins === undefined) { embedSkinSkeletonDiagnostics([]); return []; }
  if (!Array.isArray(json.skins)) throw new Error('Skin skeleton metadata found a malformed skins array.');
  const present = json.skins.flatMap((skin, skinIndex) => {
    if (!skin || typeof skin !== 'object' || Array.isArray(skin)) throw new Error(`Skin skeleton metadata found a malformed skin at index ${skinIndex}.`);
    return Object.hasOwn(skin, 'skeleton') ? [{ skin, skinIndex }] : [];
  });
  if (!present.length) { embedSkinSkeletonDiagnostics([]); return []; }
  if (!Array.isArray(json.nodes) || !json.nodes.length) throw new Error('Skin skeleton metadata requires a nonempty node graph.');
  const parents = Array.from({ length: json.nodes.length }, () => null);
  for (const [parentIndex, node] of json.nodes.entries()) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) throw new Error(`Skin skeleton metadata found a malformed node at index ${parentIndex}.`);
    if (node.children === undefined) continue;
    if (!Array.isArray(node.children)) throw new Error(`Skin skeleton metadata found malformed child links on node ${parentIndex}.`);
    const localChildren = new Set();
    for (const child of node.children) {
      if (!Number.isInteger(child) || child < 0 || child >= json.nodes.length || child === parentIndex
        || localChildren.has(child) || parents[child] !== null) {
        throw new Error('Skin skeleton metadata requires valid single-parent node links.');
      }
      localChildren.add(child);
      parents[child] = parentIndex;
    }
  }
  for (let nodeIndex = 0; nodeIndex < parents.length; nodeIndex += 1) {
    const visited = new Set();
    let current = nodeIndex;
    while (current !== null) {
      if (visited.has(current)) throw new Error('Skin skeleton metadata rejected a cyclic node graph.');
      visited.add(current);
      current = parents[current];
    }
  }
  const ancestorPath = (nodeIndex) => {
    const path = [];
    let current = nodeIndex;
    while (current !== null) { path.push(current); current = parents[current]; }
    return path.reverse();
  };
  const repairs = [];
  for (const { skin, skinIndex } of present) {
    const previousSkeleton = skin.skeleton;
    if (!Number.isInteger(previousSkeleton) || previousSkeleton < 0 || previousSkeleton >= json.nodes.length) {
      throw new Error(`Skin skeleton metadata rejected an invalid skeleton index on skin ${skinIndex}.`);
    }
    if (!Array.isArray(skin.joints) || !skin.joints.length
      || skin.joints.some((joint) => !Number.isInteger(joint) || joint < 0 || joint >= json.nodes.length)
      || new Set(skin.joints).size !== skin.joints.length) {
      throw new Error(`Skin skeleton metadata requires unique valid joint indices on skin ${skinIndex}.`);
    }
    const jointIndices = [...skin.joints];
    const jointAncestorPaths = jointIndices.map(ancestorPath);
    if (jointAncestorPaths.every((path) => path.includes(previousSkeleton))) continue;
    const shortestPath = Math.min(...jointAncestorPaths.map((path) => path.length));
    let commonPrefixLength = 0;
    while (commonPrefixLength < shortestPath
      && jointAncestorPaths.every((path) => path[commonPrefixLength] === jointAncestorPaths[0][commonPrefixLength])) {
      commonPrefixLength += 1;
    }
    if (!commonPrefixLength) throw new Error(`Skin skeleton metadata found no common joint ancestor on skin ${skinIndex}.`);
    const repairedSkeleton = jointAncestorPaths[0][commonPrefixLength - 1];
    repairs.push({
      schemaVersion: 1, policyVersion: SKIN_SKELETON_METADATA_VERSION, skinIndex,
      previousSkeleton, repairedSkeleton, jointIndices, jointAncestorPaths,
      reasonCode: 'PRESENT_SKELETON_NOT_COMMON_ANCESTOR',
    });
    skin.skeleton = repairedSkeleton;
  }
  embedSkinSkeletonDiagnostics(repairs);
  return repairs;
}

if (hasExplicitAnimationSelection || wantedAnimations.length) json.animations = wantedAnimations.map((name) => {
  const animation = json.animations?.find((candidate) => candidate.name === name);
  if (!animation && !config.incompleteImport) throw new Error(`Missing animation: ${name}`);
  if (!animation) config.incompleteImport.warnings.push(`Missing animation: ${name}`);
  return animation;
}).filter(Boolean);

// A source-specific cleanup list can contain alternate outfit props that are
// present in the same exported animator.  Keep anything the selected prefab
// explicitly identifies as an equipment attachment.
const assemblyAttachmentNames = new Set([
  ...(config.assembly?.attachments?.mainWeapon ?? []),
  ...(config.assembly?.attachments?.subWeapon ?? []),
  ...(config.assembly?.attachments?.equipmentRenderers ?? []),
].map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean));
// Profile conversions are governed by the source-evidence renderer policy.
// Do not let a legacy name list remove a profile-bound body, accessory, or
// weapon before exact source identity binding has had a chance to protect it.
// Legacy (profile-less) conversions retain their historical cleanup behavior.
const removedMeshNames = new Set(config.renderingProfile ? [] : (config.removeMeshes ?? []).filter((name) => !assemblyAttachmentNames.has(name)));
for (const node of json.nodes ?? []) {
  if (removedMeshNames.has(node.name)) delete node.mesh;
}

function embedAssembly(assembly) {
  if (!assembly?.root) return;
  const scene = json.scenes?.[Number.isInteger(json.scene) ? json.scene : 0];
  if (!scene) return;
  scene.extras = {
    ...scene.extras,
    chibi: {
      ...scene.extras?.chibi,
      assembly,
    },
  };
}

embedAssembly(config.assembly);

function embedChildRendererEvents(events, initialPose, assembly, faceRendererOverrides) {
  const rendererEvents = (events ?? []).filter((event) =>
    (event.function === 'AniEvt_DisableChildRenderer' || event.function === 'AniEvt_EnableChildRenderer')
    && Number.isInteger(event.int) && typeof event.clip === 'string' && Number.isFinite(event.time));
  const allRendererIds = [...new Set(rendererEvents.map((event) => event.int))].sort((left, right) => left - right);
  // AssetStudio/FBX2glTF preserve several face naming conventions (Face01,
  // Face_01, Face01_Mesh, Body_Face_Outline, ...). Only mesh-bearing nodes
  // are candidates: FX/cutin helper transforms can contain "Face" in their
  // name but are not renderer variants.
  const faceNodeCandidates = (json.nodes ?? []).filter((node) => /(?:^|_)Face(?:_?\d+)?(?:_(?:Mesh|Outline))?$/i.test(node.name ?? ''));
  const faceMeshNodes = faceNodeCandidates.filter((node) => Number.isInteger(node.mesh));
  let faceNodes = (faceMeshNodes.length ? faceMeshNodes : faceNodeCandidates)
    .sort((left, right) => {
      const rank = (name) => Number(name.match(/Face_?(\d+)(?:_(?:Mesh|Outline))?$/i)?.[1] || 0);
      return rank(left.name ?? '') - rank(right.name ?? '');
    });
  // A few rigs keep a permanently-disabled helper renderer in the event
  // stream. If there are more IDs than face meshes, prefer IDs that are ever
  // enabled and fill any remaining slots in stable numeric order.
  const enabledIds = new Set(rendererEvents.filter((event) => event.function === 'AniEvt_EnableChildRenderer').map((event) => event.int));
  const rendererIds = allRendererIds.length > faceNodes.length
    ? [...allRendererIds.filter((id) => enabledIds.has(id)), ...allRendererIds.filter((id) => !enabledIds.has(id))].slice(0, faceNodes.length).sort((left, right) => left - right)
    : allRendererIds;
  let mappedByOverride = false;
  if (faceRendererOverrides && rendererIds.length === faceNodes.length && rendererIds.every((id) => typeof faceRendererOverrides[id] === 'string')) {
    const overridden = rendererIds.map((id) => faceNodes.find((node) => node.name === faceRendererOverrides[id]));
    if (overridden.every(Boolean) && new Set(overridden.map((node) => node.name)).size === overridden.length) {
      faceNodes = overridden;
      mappedByOverride = true;
    }
  }
  // The animator's integer IDs do not always follow the exported Face01 /
  // Face02 suffix order. When the selected source assembly provides an
  // enabled flag for every face renderer, use the initial event state to map
  // IDs to nodes by matching the boolean state. This is unambiguous for rigs
  // such as Shun 10144 (Face01=false, Face02=true; ID 3=true, ID 4=false)
  // and Chiaki Swimsuit (one enabled, two disabled face variants).
  let mappedBySourceState = mappedByOverride;
  if (!mappedByOverride && assembly?.renderers && initialPose && rendererIds.length === faceNodes.length) {
    const sourceFaceRenderers = assembly.renderers.filter((renderer) => faceNodes.some((node) => node.name === renderer.name));
    const sourceStates = new Map(sourceFaceRenderers.map((renderer) => [renderer.name, renderer.enabled]));
    const initialStates = new Map();
    for (const event of rendererEvents) {
      if (event.clip !== initialPose || event.time > 1e-4) continue;
      initialStates.set(event.int, event.function === 'AniEvt_EnableChildRenderer');
    }
    if (sourceFaceRenderers.length === faceNodes.length && rendererIds.every((id) => initialStates.has(id))) {
      const mapped = new Map();
      for (const state of [true, false]) {
        const ids = rendererIds.filter((id) => initialStates.get(id) === state);
        const nodes = sourceFaceRenderers.filter((renderer) => sourceStates.get(renderer.name) === state);
        if (ids.length !== nodes.length) continue;
        ids.forEach((id, index) => mapped.set(id, nodes[index].name));
      }
      if (mapped.size === rendererIds.length) {
        faceNodes = rendererIds.map((id) => faceNodes.find((node) => node.name === mapped.get(id)));
        mappedBySourceState = faceNodes.every(Boolean);
      }
    }
  }
  // The exported node suffix is not guaranteed to match the animator's
  // child-renderer ID. When one face mesh owns the EyeMouth material, bind
  // the renderer enabled by the selected initial pose to that mesh. This
  // fixes rigs such as Ibuki/Koyuki/Reisa whose numeric order is reversed,
  // while leaving multi-EyeMouth rigs on their stable exporter ordering.
  const eyeMouthFaceNodes = faceNodes.filter((node) =>
    (json.meshes?.[node.mesh]?.primitives ?? []).some((primitive) => /EyeMouth|EyeMoutn/i.test(json.materials?.[primitive.material]?.name ?? '')),
  );
  if (!mappedBySourceState && initialPose && eyeMouthFaceNodes.length === 1 && rendererIds.length === faceNodes.length) {
    const states = new Map();
    for (const event of rendererEvents) {
      if (event.clip !== initialPose || event.time > 1e-4) continue;
      states.set(event.int, event.function === 'AniEvt_EnableChildRenderer');
    }
    const enabledInitialIds = [...states.entries()].filter(([, visible]) => visible).map(([id]) => id);
    if (enabledInitialIds.length === 1) {
      const enabledIndex = rendererIds.indexOf(enabledInitialIds[0]);
      const eyeMouthIndex = faceNodes.indexOf(eyeMouthFaceNodes[0]);
      if (enabledIndex >= 0 && eyeMouthIndex >= 0 && enabledIndex !== eyeMouthIndex) {
        [faceNodes[enabledIndex], faceNodes[eyeMouthIndex]] = [faceNodes[eyeMouthIndex], faceNodes[enabledIndex]];
      }
    }
  }
  // Child-renderer events are used by rigs with alternate face meshes. The
  // source renderer list and exported face variants have the same stable
  // order, so only embed the mapping when it is unambiguous.
  if (rendererIds.length < 2 || rendererIds.length !== faceNodes.length) return;
  const scene = json.scenes?.[Number.isInteger(json.scene) ? json.scene : 0];
  if (!scene) return;
  scene.extras = {
    ...scene.extras,
    chibi: {
      ...scene.extras?.chibi,
      rendererSlots: rendererIds.map((id, index) => ({ id, nodes: [faceNodes[index].name] })),
      rendererEvents,
    },
  };
}

if (!config.renderingProfile && !config.incompleteImport) {
  embedChildRendererEvents(config.childRendererEvents, config.profile?.initialPose, config.assembly, config.faceRendererOverrides);
}

function sourceReferenceKey(reference) {
  return reference
    ? `${String(reference.bundleSha256).toLowerCase()}:${String(reference.serializedFile).toLowerCase()}:${String(reference.objectId)}`
    : '';
}

// Material claims are compared as source data, not by object insertion order.
// A single exported material may be shared by several source slots, but only
// when every output-affecting claim is identical.  Keep this representation
// deterministic so cache artifacts and validation diagnostics are reproducible.
function stableProfileValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableProfileValue).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableProfileValue(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function materialClaimSignature(slot, drawRank, rendererMaterialEvidence = null) {
  return stableProfileValue({
    sourceMaterialReference: slot.sourceMaterialReference ?? null,
    sourceMaterialName: slot.sourceMaterialName ?? null,
    sourceShaderReference: slot.sourceShaderReference ?? null,
    sourceShaderName: slot.sourceShaderName ?? null,
    sourceShaderParsedName: slot.sourceShaderParsedName ?? null,
    shaderProgramBlobSha256: slot.shaderProgramBlobSha256 ?? null,
    adapterId: slot.adapterId ?? null,
    adapterSettings: slot.adapterSettings ?? null,
    materialProperties: slot.materialProperties ?? null,
    renderState: slot.renderState ?? null,
    rendererMaterialEvidence,
    drawRank,
  });
}

function nodeHierarchyPaths() {
  const parents = new Map();
  for (const [parent, node] of (json.nodes ?? []).entries()) {
    for (const child of node.children ?? []) parents.set(child, parent);
  }
  return (json.nodes ?? []).map((_, index) => {
    const names = [], seen = new Set();
    let current = index;
    while (Number.isInteger(current) && !seen.has(current)) {
      seen.add(current);
      names.push(json.nodes[current].name ?? `node-${current}`);
      current = parents.get(current);
    }
    names.reverse();
    if (names[0] === 'RootNode') names.shift();
    return names.join('/');
  });
}

const PRESENTATION_EXCLUSION_REASON_CODES = new Set([
  'PRESENTATION_SHADER_OR_MATERIAL',
  'PRESENTATION_MESH_10210_OR_HELPER',
]);

const CURRENT_RENDERING_PROFILE_VERSION = 'chibi-rendering-profile-v10';
const CURRENT_RENDERING_POLICY_VERSION = 'chibi-rendering-policy-v14';
const FX_EXCLUSION_POLICY_VERSION = 'chibi-particle-only-instantiate-fx-v2';
const FX_INSTANTIATE_EVENT_FUNCTIONS = new Set(['AniEvt_InstantiateFx', 'InstantiateFx']);
const APPROVED_FX_MONOSCRIPT_SOURCE_KEYS = new Set([
  'e1fb78acaa16173dcf2e50f28bc43d8e18ddbdc0717f89a892b0ce6eac9dec29:cab-4e374e23f1bd4e7218b8fbcbec01546f:460590081893560622',
  'e1fb78acaa16173dcf2e50f28bc43d8e18ddbdc0717f89a892b0ce6eac9dec29:cab-4e374e23f1bd4e7218b8fbcbec01546f:-529717931869727251',
  'e1fb78acaa16173dcf2e50f28bc43d8e18ddbdc0717f89a892b0ce6eac9dec29:cab-4e374e23f1bd4e7218b8fbcbec01546f:4955142931926258075',
]);

function exactFxSourceReferenceKey(reference, label) {
  const key = exactSourceReferenceKey(reference, label);
  if (!/^[0-9a-f]{64}$/i.test(reference.bundleSha256)
    || !/^-?\d+$/.test(reference.objectId) || reference.objectId === '0') {
    throw new Error(`${label} is not an exact non-null Unity source identity.`);
  }
  return key;
}

function fxObjectPointerKey(pointer) {
  if (!pointer || typeof pointer.file !== 'string' || !pointer.file
    || (typeof pointer.pathId !== 'string' && typeof pointer.pathId !== 'number')) return '';
  const pathId = String(pointer.pathId);
  if (!/^-?\d+$/.test(pathId) || pathId === '0') return '';
  return `${pointer.file.replaceAll('\\', '/').toLowerCase()}:${pathId}`;
}

function fxEventIdentityKey(record, label) {
  if (!record || typeof record.clip !== 'string' || !record.clip
    || typeof record.time !== 'number' || !Number.isFinite(record.time)
    || !Number.isInteger(record.order) || record.order < 0) {
    throw new Error(`${label} has an invalid selected event identity.`);
  }
  const sourceClipKey = exactFxSourceReferenceKey(record.eventSourceReference, `${label} source AnimationClip`);
  const targetKey = exactFxSourceReferenceKey(record.targetReference, `${label} target`);
  return JSON.stringify([sourceClipKey, record.clip, record.time, record.order, targetKey]);
}

function validateFxPPtrEvidence(item, label, coreSourceKeys, corePointerKeys) {
  const evidenceKeys = ['pointer', 'fileID', 'identityResolved', 'objectResolved', 'sourceReference'].sort();
  const pointerKeys = ['file', 'pathId', 'externalGuid', 'builtinResource'];
  if (!item || Object.keys(item).sort().join('\0') !== evidenceKeys.join('\0')
    || item.identityResolved !== true || typeof item.objectResolved !== 'boolean'
    || !Number.isInteger(item.fileID) || item.fileID < 0
    || !item.pointer || typeof item.pointer !== 'object'
    || Object.keys(item.pointer).some(key => !pointerKeys.includes(key))
    || typeof item.pointer.file !== 'string' || !item.pointer.file.trim()
      || typeof item.pointer.pathId !== 'string' || !/^(?:0|-?[1-9]\d*)$/.test(item.pointer.pathId)
    || (item.pointer.externalGuid !== undefined && item.pointer.externalGuid !== null
      && (typeof item.pointer.externalGuid !== 'string' || !/^[0-9a-f]{32}$/i.test(item.pointer.externalGuid.replaceAll('-', ''))))) {
    throw new Error(`${label} has malformed or unresolved particle renderer PPtr evidence.`);
  }

  const pathId = item.pointer.pathId;
  const sourceKey = item.sourceReference === null
    ? null
    : exactFxSourceReferenceKey(item.sourceReference, `${label} source reference`);
  if (sourceKey !== null && (item.sourceReference.serializedFile.replaceAll('\\', '/').toLowerCase()
      !== item.pointer.file.replaceAll('\\', '/').toLowerCase()
    || item.sourceReference.objectId !== pathId)) {
    throw new Error(`${label} source reference disagrees with its serialized PPtr.`);
  }

  const explicitNull = pathId === '0' && item.objectResolved === false && sourceKey === null;
  const resolvedObject = pathId !== '0' && item.objectResolved === true;
  const externalIdentityOnly = pathId !== '0' && item.fileID > 0 && item.objectResolved === false;
  // Keep final GLB validation aligned with the profile/core-cache evidence states.
  if (!explicitNull && !resolvedObject && !externalIdentityOnly) {
    throw new Error(`${label} has unresolved particle renderer PPtr evidence.`);
  }
  if (sourceKey !== null && coreSourceKeys.has(sourceKey)) throw new Error(`${label} overlaps required core source content.`);
  const pointerKey = fxObjectPointerKey(item.pointer);
  if (pointerKey && corePointerKeys.has(pointerKey)) throw new Error(`${label} overlaps a required core renderer, mesh, material, or assembly pointer.`);
  return pointerKey;
}

function validateFxExclusionProof(proof, coreSourceKeys, corePointerKeys) {
  const eventKey = fxEventIdentityKey(proof, 'Rendering profile FX exclusion proof');
  if (proof.schemaVersion !== 1 || proof.policyVersion !== FX_EXCLUSION_POLICY_VERSION
    || !FX_INSTANTIATE_EVENT_FUNCTIONS.has(proof.function) || proof.completeGraph !== true || proof.disjointFromCore !== true
    || proof.reasonCode !== 'SOURCE_PARTICLE_ONLY_FX_TARGET'
    || !Array.isArray(proof.evidence) || proof.evidence.length === 0
    || proof.evidence.some(item => typeof item !== 'string' || !item)) {
    throw new Error(`Rendering profile FX exclusion proof ${eventKey} is not a complete source-evidenced particle-only proof.`);
  }
  const sourceClipKey = exactFxSourceReferenceKey(proof.eventSourceReference, 'Rendering profile FX source AnimationClip');
  const targetKey = exactFxSourceReferenceKey(proof.targetReference, 'Rendering profile FX target');
  const requiredEvidence = [
    `exact source AnimationClip ${sourceClipKey}`,
    `selected event is ${proof.function} at ${proof.clip} ${proof.time}s (source order ${proof.order})`,
    `exact target PPtr resolves to ${targetKey}`,
    'target graph contains no renderer, mesh, material, or transform identity shared with selected core character content',
  ];
  if (requiredEvidence.some(item => !proof.evidence.includes(item))) {
    throw new Error(`Rendering profile FX exclusion proof ${eventKey} is missing exact event, target, or core-disjointness evidence.`);
  }

  const gameObjectKeys = (proof.gameObjectReferences ?? []).map((reference, index) =>
    exactFxSourceReferenceKey(reference, `Rendering profile FX ${eventKey} GameObject ${index}`));
  const transformKeys = (proof.transformReferences ?? []).map((reference, index) =>
    exactFxSourceReferenceKey(reference, `Rendering profile FX ${eventKey} Transform ${index}`));
  if (!gameObjectKeys.length || gameObjectKeys.length !== transformKeys.length
    || new Set(gameObjectKeys).size !== gameObjectKeys.length || new Set(transformKeys).size !== transformKeys.length
    || !gameObjectKeys.includes(targetKey)
    || !proof.componentReferences?.length || !proof.componentReferences.some(item => item?.type === 'Transform')) {
    throw new Error(`Rendering profile FX exclusion proof ${eventKey} does not preserve a complete nonempty object/transform graph.`);
  }
  const componentKeys = (proof.componentReferences ?? []).map((item, index) => {
    if (!item || typeof item.type !== 'string' || !item.type) {
      throw new Error(`Rendering profile FX exclusion proof ${eventKey} component ${index} has no exact type.`);
    }
    const key = exactFxSourceReferenceKey(item.sourceReference, `Rendering profile FX ${eventKey} component ${index}`);
    if (item.sourceReference.bundleSha256.toLowerCase() !== proof.targetReference.bundleSha256.toLowerCase()) {
      throw new Error(`Rendering profile FX exclusion proof ${eventKey} component ${index} is not from the target bundle.`);
    }
    return key;
  });
  if (new Set(componentKeys).size !== componentKeys.length) {
    throw new Error(`Rendering profile FX exclusion proof ${eventKey} repeats a component source identity.`);
  }
  const componentTransformKeys = (proof.componentReferences ?? [])
    .filter(item => item.type === 'Transform' || item.type === 'RectTransform')
    .map(item => sourceReferenceKey(item.sourceReference)).sort();
  if (stableProfileValue([...transformKeys].sort()) !== stableProfileValue(componentTransformKeys)) {
    throw new Error(`Rendering profile FX exclusion proof ${eventKey} does not preserve every exact Transform component.`);
  }

  const scriptKeys = (proof.approvedMonoScriptReferences ?? []).map((reference, index) => {
    const key = exactFxSourceReferenceKey(reference, `Rendering profile FX ${eventKey} approved MonoScript ${index}`);
    if (!APPROVED_FX_MONOSCRIPT_SOURCE_KEYS.has(key)) {
      throw new Error(`Rendering profile FX exclusion proof ${eventKey} contains an unapproved MonoScript source identity.`);
    }
    return key;
  });
  const monoBehaviourCount = (proof.componentReferences ?? []).filter(item => item.type === 'MonoBehaviour').length;
  if (scriptKeys.length !== monoBehaviourCount) {
    throw new Error(`Rendering profile FX exclusion proof ${eventKey} does not pin one approved MonoScript identity per MonoBehaviour.`);
  }

  const particleRendererKeys = (proof.particleRendererReferences ?? []).map((reference, index) =>
    exactFxSourceReferenceKey(reference, `Rendering profile FX ${eventKey} ParticleSystemRenderer ${index}`));
  const graphRendererKeys = (proof.componentReferences ?? [])
    .filter(item => item.type === 'ParticleSystemRenderer')
    .map(item => sourceReferenceKey(item.sourceReference)).sort();
  if (!particleRendererKeys.length || new Set(particleRendererKeys).size !== particleRendererKeys.length
    || stableProfileValue([...particleRendererKeys].sort()) !== stableProfileValue(graphRendererKeys)) {
    throw new Error(`Rendering profile FX exclusion proof ${eventKey} does not preserve the exact particle renderer set.`);
  }
  const rendererAssets = proof.rendererAssets;
  if (!Array.isArray(rendererAssets) || rendererAssets.length !== particleRendererKeys.length) {
    throw new Error(`Rendering profile FX exclusion proof ${eventKey} lacks one renderer asset record per particle renderer.`);
  }
  const assetRendererKeys = rendererAssets.map((item, index) =>
    exactFxSourceReferenceKey(item?.rendererReference, `Rendering profile FX ${eventKey} renderer asset ${index}`)).sort();
  if (stableProfileValue([...particleRendererKeys].sort()) !== stableProfileValue(assetRendererKeys)) {
    throw new Error(`Rendering profile FX exclusion proof ${eventKey} renderer asset identities do not match its particle renderers.`);
  }

  const graphReferences = [proof.targetReference, ...(proof.gameObjectReferences ?? []), ...(proof.transformReferences ?? []),
    ...(proof.componentReferences ?? []).map(item => item.sourceReference)];
  for (const [index, reference] of graphReferences.entries()) {
    const key = exactFxSourceReferenceKey(reference, `Rendering profile FX ${eventKey} graph reference ${index}`);
    if (reference.bundleSha256.toLowerCase() !== proof.targetReference.bundleSha256.toLowerCase()) {
      throw new Error(`Rendering profile FX exclusion proof ${eventKey} graph reference ${index} is not from the target bundle.`);
    }
    const pointerKey = fxObjectPointerKey({ file: reference.serializedFile, pathId: reference.objectId });
    if (coreSourceKeys.has(key) || corePointerKeys.has(pointerKey)) {
      throw new Error(`Rendering profile FX exclusion proof ${eventKey} graph overlaps required core character content.`);
    }
  }
  for (const [index, asset] of rendererAssets.entries()) {
    const rendererKey = exactFxSourceReferenceKey(asset.rendererReference, `Rendering profile FX ${eventKey} renderer ${index}`);
    if (coreSourceKeys.has(rendererKey)) throw new Error(`Rendering profile FX exclusion proof ${eventKey} renderer overlaps required core content.`);
    const sourceAssetEvidence = [asset.meshReference, ...(asset.materialReferences ?? [])];
    if (!Array.isArray(asset.materialReferences)) throw new Error(`Rendering profile FX exclusion proof ${eventKey} has no material PPtr list.`);
    for (const [assetIndex, pointer] of sourceAssetEvidence.entries()) {
      validateFxPPtrEvidence(pointer, `Rendering profile FX ${eventKey} renderer ${index} asset ${assetIndex}`, coreSourceKeys, corePointerKeys);
    }
  }
  return eventKey;
}

function coreFxIdentitySets(profile) {
  const sourceKeys = new Set(), pointerKeys = new Set();
  const addReference = (reference) => {
    if (!reference) return;
    const key = exactFxSourceReferenceKey(reference, 'Required core profile source reference');
    sourceKeys.add(key);
    pointerKeys.add(fxObjectPointerKey({ file: reference.serializedFile, pathId: reference.objectId }));
  };
  const addPointer = (pointer) => {
    if (pointer && fxObjectPointerKey(pointer)) pointerKeys.add(fxObjectPointerKey(pointer));
  };
  addReference(profile.sourcePrefab?.reference);
  for (const renderer of profile.renderers ?? []) {
    addReference(renderer.sourceReference);
    addReference(renderer.sourceMesh?.sourceReference);
    addPointer(renderer.sourceMesh);
    for (const slot of renderer.materialSlots ?? []) {
      addReference(slot.sourceMaterialReference);
      addReference(slot.sourceShaderReference);
    }
  }
  const assembly = profile.assembly;
  if (assembly) {
    addReference(assembly.prefabReference);
    addPointer(assembly.prefabTarget);
    for (const renderer of assembly.renderers ?? []) {
      addReference(renderer.sourceReference);
      addReference(renderer.meshSourceReference);
      addPointer(renderer.mesh);
      addPointer(renderer.rootBone);
      for (const pointer of [...(renderer.transformChain ?? []), ...(renderer.boneReferences ?? [])]) addPointer(pointer);
      for (const slot of renderer.materialSlots ?? []) {
        addReference(slot.sourceMaterialReference);
        addPointer(slot.material);
      }
    }
    const attachments = assembly.attachments ?? {};
    for (const key of ['mainWeapon', 'subWeapon', 'eyes', 'headBone', 'fxParentBones']) {
      for (const pointer of attachments[key] ?? []) addPointer(pointer);
    }
    for (const key of ['equipmentRendererReferences']) for (const reference of attachments[key] ?? []) addReference(reference);
    for (const group of attachments.equipmentRendererGroups ?? []) {
      addPointer(group.attachment);
      for (const reference of group.sourceReferences ?? []) addReference(reference);
    }
    for (const pointer of attachments.mouthRenderer ?? []) { addReference(pointer.sourceReference); addPointer(pointer); }
    for (const item of attachments.mouthMetadata ?? []) { addReference(item.sourceRendererReference); addPointer(item.renderer); }
  }
  return { sourceKeys, pointerKeys };
}

function assemblyAttachmentEvidence(assembly) {
  const references = new Set();
  const attachments = assembly?.attachments ?? {};
  for (const key of ['equipmentRendererReferences', 'weaponRendererReferences', 'mainWeaponRendererReferences', 'subWeaponRendererReferences', 'accessoryRendererReferences']) {
    for (const [index, reference] of (attachments[key] ?? []).entries()) {
      references.add(exactSourceReferenceKey(reference, `Assembly attachment ${key}[${index}]`));
    }
  }
  if ((attachments.equipmentRendererAmbiguities ?? []).length) {
    throw new Error('Source assembly has unresolved equipment renderer attachment identity ambiguity.');
  }
  return { references };
}

function exactSourceReferenceKey(reference, label) {
  if (!reference || typeof reference !== 'object'
    || typeof reference.bundleSha256 !== 'string' || !reference.bundleSha256
    || typeof reference.serializedFile !== 'string' || !reference.serializedFile
    || typeof reference.objectId !== 'string' || !reference.objectId) {
    throw new Error(`${label} has no exact full source renderer reference.`);
  }
  return sourceReferenceKey(reference);
}

function sourcePointerKey(pointer) {
  if (!pointer || typeof pointer !== 'object') return null;
  if (typeof pointer.file !== 'string' || !pointer.file
    || typeof pointer.pathId !== 'string' || !pointer.pathId) return null;
  return `${pointer.file.toLowerCase()}:${pointer.pathId}:${typeof pointer.externalGuid === 'string' ? pointer.externalGuid.toLowerCase() : ''}`;
}

function builtinResourceKey(resource) {
  if (!resource || typeof resource !== 'object') return null;
  if (typeof resource.guid !== 'string' || typeof resource.file !== 'string'
    || typeof resource.pathId !== 'string' || typeof resource.name !== 'string') return null;
  return `${resource.guid.toLowerCase()}:${resource.file.toLowerCase()}:${resource.pathId}:${resource.name}`;
}

function exactBuiltinQuadResource(resource) {
  return builtinResourceKey(resource) === `${UNITY_BUILTIN_RESOURCES_GUID}:${UNITY_BUILTIN_RESOURCES_FILE}:${UNITY_BUILTIN_QUAD_PATH_ID}:${UNITY_BUILTIN_QUAD_NAME}`;
}

function sourceMeshMatchesAssembly(exclusion, assemblyRenderer, sourceKey) {
  const excludedMesh = exclusion.sourceMesh;
  const assemblyMesh = assemblyRenderer.mesh ?? null;
  if ((excludedMesh === null) !== (assemblyMesh === null)) {
    throw new Error(`Presentation exclusion ${sourceKey} source mesh does not match its source assembly renderer.`);
  }
  if (excludedMesh === null) return;
  if (typeof excludedMesh !== 'object' || !sourcePointerKey(excludedMesh) || !sourcePointerKey(assemblyMesh)) {
    throw new Error(`Presentation exclusion ${sourceKey} has no exact source mesh pointer.`);
  }
  if (sourcePointerKey(excludedMesh) !== sourcePointerKey(assemblyMesh)) {
    throw new Error(`Presentation exclusion ${sourceKey} source mesh pointer does not match its source assembly renderer.`);
  }
  const excludedMeshReference = excludedMesh.sourceReference ?? null;
  const assemblyMeshReference = assemblyRenderer.meshSourceReference ?? null;
  if ((excludedMeshReference === null) !== (assemblyMeshReference === null)) {
    throw new Error(`Presentation exclusion ${sourceKey} source mesh identity does not match its source assembly renderer.`);
  }
  if (excludedMeshReference !== null
    && exactSourceReferenceKey(excludedMeshReference, `Presentation exclusion ${sourceKey} source mesh`)
      !== exactSourceReferenceKey(assemblyMeshReference, `Assembly renderer ${sourceKey} source mesh`)) {
    throw new Error(`Presentation exclusion ${sourceKey} source mesh identity does not match its source assembly renderer.`);
  }
  const excludedBuiltin = excludedMesh.builtinResource ?? null;
  const assemblyBuiltin = assemblyMesh.builtinResource ?? null;
  if ((excludedBuiltin === null) !== (assemblyBuiltin === null)
    || (excludedBuiltin !== null && builtinResourceKey(excludedBuiltin) !== builtinResourceKey(assemblyBuiltin))) {
    throw new Error(`Presentation exclusion ${sourceKey} built-in mesh evidence does not match its source assembly renderer.`);
  }
}

function sourceMaterialEvidenceKey(material, label) {
  if (!material || typeof material !== 'object'
    || typeof material.name !== 'string' || !material.name
    || !material.sourceReference || typeof material.sourceReference !== 'object'
    || typeof material.shaderName !== 'string' || !material.shaderName
    || !material.shaderReference || typeof material.shaderReference !== 'object') {
    throw new Error(`${label} is missing exact source material and shader identities.`);
  }
  const materialKey = exactSourceReferenceKey(material.sourceReference, `${label} material`);
  const shaderKey = exactSourceReferenceKey(material.shaderReference, `${label} shader`);
  return { materialKey, shaderKey };
}

function normalizedSourceSerializedFile(value) {
  return typeof value === 'string' ? value.replaceAll('\\', '/').toLowerCase() : '';
}

function exactNullPointer(pointer, ownerFile) {
  return Boolean(pointer && typeof pointer === 'object'
    && typeof pointer.file === 'string' && pointer.file
    && typeof pointer.pathId === 'string' && pointer.pathId === '0'
    && !pointer.externalGuid && !pointer.builtinResource
    && normalizedSourceSerializedFile(pointer.file) === normalizedSourceSerializedFile(ownerFile));
}

function exactNullMaterialEvidence(material) {
  return Boolean(material && typeof material === 'object'
    && material.name === '(exact null material pointer)'
    && material.sourceReference === null
    && material.shaderName === null
    && material.shaderReference === null);
}

function verifyExclusionEvidence(exclusion, assemblyRenderer, sourceKey, coreMaterialKeys) {
  if (!Object.prototype.hasOwnProperty.call(exclusion, 'sourceMesh')) {
    throw new Error(`Presentation exclusion ${sourceKey} has no structured source mesh evidence.`);
  }
  sourceMeshMatchesAssembly(exclusion, assemblyRenderer, sourceKey);
  const materials = exclusion.materials;
  if (!materials.length) {
    if (exclusion.reasonCode === 'PRESENTATION_SHADER_OR_MATERIAL') {
      throw new Error(`Presentation exclusion ${sourceKey} has no source material evidence.`);
    }
  }
  const assemblySlots = Array.isArray(assemblyRenderer.materialSlots) ? assemblyRenderer.materialSlots : [];
  if (assemblySlots.length !== materials.length) {
    throw new Error(`Presentation exclusion ${sourceKey} material evidence does not match its source assembly slots.`);
  }
  const evidence = exclusion.evidence;
  const ownerFile = assemblyRenderer.sourceReference?.serializedFile;
  const exactNullMeshClaim = typeof ownerFile === 'string' && ownerFile
    ? `source mesh is the exact null pointer ${normalizedSourceSerializedFile(ownerFile)}:0`
    : null;
  const exactNullMaterialClaim = typeof ownerFile === 'string' && ownerFile
    ? assemblySlots.length
      ? `every source material slot is the exact null pointer ${normalizedSourceSerializedFile(ownerFile)}:0`
      : 'source renderer has no material slots (exact null material set)'
    : null;
  // The profile builder intentionally preserves helper renderers whose mesh
  // and material PPtrs are exact nulls.  They have no source material/shader
  // identities to prove; accept only this complete, reason-coded shape and
  // its exact-null evidence.  All other exclusions remain identity-strict.
  const exactInertNullPointerHelper = exclusion.reasonCode === 'PRESENTATION_MESH_10210_OR_HELPER'
    && exactNullPointer(exclusion.sourceMesh, ownerFile)
    && exactNullPointer(assemblyRenderer.mesh, ownerFile)
    && exclusion.sourceMesh.sourceReference === null
    && (assemblyRenderer.meshSourceReference ?? null) === null
    && (exclusion.sourceMesh.builtinResource ?? null) === null
    && (assemblyRenderer.mesh.builtinResource ?? null) === null
    && assemblySlots.every((slot) => (slot?.sourceMaterialReference ?? null) === null
      && (slot?.sourceShaderReference ?? null) === null
      && (slot?.shaderReference ?? null) === null
      && exactNullPointer(slot?.material, ownerFile))
    && materials.every(exactNullMaterialEvidence);
  if (exactInertNullPointerHelper
    && (!exactNullMeshClaim || !evidence.includes(exactNullMeshClaim)
      || !exactNullMaterialClaim || !evidence.includes(exactNullMaterialClaim))) {
    throw new Error(`Presentation exclusion ${sourceKey} is missing exact inert null-pointer source evidence.`);
  }
  const exactMaterialEvidenceClaims = new Set();
  const exactShaderEvidenceClaims = new Set();
  materials.forEach((material, index) => {
    const label = `Presentation exclusion ${sourceKey} material ${index}`;
    if (exactInertNullPointerHelper) return;
    const { materialKey, shaderKey } = sourceMaterialEvidenceKey(material, label);
    const assemblyMaterialReference = assemblySlots[index]?.sourceMaterialReference ?? null;
    if (!assemblyMaterialReference
      || materialKey !== exactSourceReferenceKey(assemblyMaterialReference, `${label} assembly slot`)) {
      throw new Error(`${label} does not match its source assembly material slot.`);
    }
    // Some source readers may carry shader identity on the assembly slot as
    // well.  When it is present, require the exclusion claim to agree with
    // that exact source identity; never infer it from a name or slot order.
    const assemblyShaderReference = assemblySlots[index]?.sourceShaderReference
      ?? assemblySlots[index]?.shaderReference
      ?? null;
    if (assemblyShaderReference
      && shaderKey !== exactSourceReferenceKey(assemblyShaderReference, `${label} assembly shader`)) {
      throw new Error(`${label} does not match its source assembly shader identity.`);
    }
    if (coreMaterialKeys.has(materialKey)) {
      throw new Error(`Presentation exclusion ${sourceKey} shares a source material identity with core character content.`);
    }
    exactMaterialEvidenceClaims.add(`exact source material reference ${materialKey}`);
    exactShaderEvidenceClaims.add(`exact source shader reference ${shaderKey}`);
  });
  const requiredRendererClaim = `exact source renderer reference ${sourceKey}`;
  if (!evidence.includes(requiredRendererClaim)) {
    throw new Error(`Presentation exclusion ${sourceKey} is missing its exact source renderer evidence.`);
  }
  if (typeof exclusion.hierarchyPath === 'string'
    && !evidence.includes(`source hierarchy ${exclusion.hierarchyPath}`)
    && !exactInertNullPointerHelper) {
    throw new Error(`Presentation exclusion ${sourceKey} is missing its exact source hierarchy evidence.`);
  }
  const materialNames = new Set(materials.map(material => material.name));
  const shaderNames = new Set(materials.map(material => material.shaderName));
  const hierarchyClaim = typeof exclusion.hierarchyPath === 'string'
    ? `source hierarchy ${exclusion.hierarchyPath}` : null;
  const exactMeshClaim = exclusion.sourceMesh?.sourceReference
    ? `exact source mesh reference ${exactSourceReferenceKey(exclusion.sourceMesh.sourceReference, `Presentation exclusion ${sourceKey} source mesh`)}`
    : null;
  let presentationClaim = false;
  for (const claim of evidence) {
    if (claim === requiredRendererClaim || claim === hierarchyClaim) continue;
    // These identity claims are emitted by the source-evidence policy.  They
    // are accepted only when they correspond to the exact material/shader
    // records checked above (and, for mesh, to sourceMeshMatchesAssembly).
    if (exactMaterialEvidenceClaims.has(claim) || exactShaderEvidenceClaims.has(claim) || claim === exactMeshClaim) {
      presentationClaim = true;
      continue;
    }
    if (exactInertNullPointerHelper && (claim === exactNullMeshClaim || claim === exactNullMaterialClaim)) {
      presentationClaim = true;
      continue;
    }
    if (claim === 'source renderer is in an FX/camera/cutin/presentation branch'
      || claim === 'source hierarchy identifies a presentation role'
      || claim === 'source renderer is an explicitly inert helper') {
      presentationClaim = true;
      continue;
    }
    if (claim === 'source mesh is the exact Unity built-in Quad') {
      if (!exactBuiltinQuadResource(exclusion.sourceMesh?.builtinResource)) {
        throw new Error(`Presentation exclusion ${sourceKey} claims an exact Unity built-in Quad without exact source evidence.`);
      }
      presentationClaim = true;
      continue;
    }
    if (claim === 'source mesh is an ambiguous Unity built-in Quad pointer') {
      const mesh = exclusion.sourceMesh;
      if (!mesh || mesh.file?.toLowerCase() !== UNITY_BUILTIN_RESOURCES_FILE
        || String(mesh.pathId) !== UNITY_BUILTIN_QUAD_PATH_ID) {
        throw new Error(`Presentation exclusion ${sourceKey} claims an ambiguous Unity built-in Quad without matching source evidence.`);
      }
      presentationClaim = true;
      continue;
    }
    const materialClaim = claim.match(/^source material is explicitly effect-scoped: (.+)$/);
    if (materialClaim) {
      if (!materialNames.has(materialClaim[1])) {
        throw new Error(`Presentation exclusion ${sourceKey} has material evidence that does not match its source materials.`);
      }
      presentationClaim = true;
      continue;
    }
    const shaderClaim = claim.match(/^source shader is an effect family: (.+)$/);
    if (shaderClaim) {
      if (!shaderNames.has(shaderClaim[1])) {
        throw new Error(`Presentation exclusion ${sourceKey} has shader evidence that does not match its source materials.`);
      }
      presentationClaim = true;
      continue;
    }
    throw new Error(`Presentation exclusion ${sourceKey} has unknown or mixed source evidence: ${claim}`);
  }
  if (!presentationClaim) {
    throw new Error(`Presentation exclusion ${sourceKey} has no explicit presentation-only source evidence.`);
  }
  if (exclusion.reasonCode === 'PRESENTATION_MESH_10210_OR_HELPER'
    && exclusion.sourceMesh === null
    && !evidence.includes('source renderer is an explicitly inert helper')) {
    throw new Error(`Presentation exclusion ${sourceKey} has no exact inert-helper or built-in mesh evidence.`);
  }
}

function canonicalExcludedRenderer(record) {
  return {
    sourceReference: record?.sourceReference ?? null,
    name: record?.name ?? null,
    hierarchyPath: record?.hierarchyPath ?? null,
    reasonCode: record?.reasonCode ?? null,
    evidence: Array.isArray(record?.evidence) ? [...record.evidence] : null,
    sourceMesh: record?.sourceMesh ?? null,
    materials: (Array.isArray(record?.materials) ? record.materials : []).map((material) => ({
      name: material?.name ?? null,
      sourceReference: material?.sourceReference ?? null,
      shaderName: material?.shaderName ?? null,
      shaderReference: material?.shaderReference ?? null,
    })),
  };
}

function canonicalExcludedEvent(event) {
  return {
    clip: event?.clip ?? null,
    time: event?.time ?? null,
    action: event?.action ?? null,
    sourceRendererReference: event?.sourceRendererReference ?? null,
    order: event?.order ?? null,
    reasonCode: event?.reasonCode ?? null,
    evidence: Array.isArray(event?.evidence) ? [...event.evidence] : null,
  };
}

function compareCanonicalRecords(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateEquipmentBindingEvidence(profile) {
  const evidencePresent = profile?.equipmentBindingEvidence !== undefined
    || profile?.validation?.equipmentBindingEvidence !== undefined;
  const blockersPresent = profile?.coreRendererBlockers !== undefined
    || profile?.validation?.coreRendererBlockers !== undefined;
  const evidence = profile?.equipmentBindingEvidence;
  const validationEvidence = profile?.validation?.equipmentBindingEvidence;
  const blockers = profile?.coreRendererBlockers;
  const validationBlockers = profile?.validation?.coreRendererBlockers;
  if (evidencePresent) {
    if (!Array.isArray(evidence) || !Array.isArray(validationEvidence)
      || stableProfileValue(evidence) !== stableProfileValue(validationEvidence)) {
      throw new Error("Rendering profile equipment-binding evidence does not match its validation records.");
    }
  }
  if (blockersPresent) {
    if (!Array.isArray(blockers) || !Array.isArray(validationBlockers)
      || stableProfileValue(blockers) !== stableProfileValue(validationBlockers)) {
      throw new Error("Rendering profile core-renderer blockers do not match its validation records.");
    }
    if (blockers.length || profile?.validation?.unresolved?.length) {
      throw new Error("Rendering profile contains unresolved core-renderer blockers.");
    }
  }
  if (!evidencePresent && !blockersPresent) return { evidence: [], blockers: [], present: false };

  const exactReferenceKey = (reference, label) => {
    if (!reference || typeof reference !== 'object'
      || typeof reference.bundleSha256 !== 'string' || !reference.bundleSha256
      || typeof reference.serializedFile !== 'string' || !reference.serializedFile
      || typeof reference.objectId !== 'string' || !reference.objectId) {
      throw new Error(`${label} has no exact full source identity.`);
    }
    return sourceReferenceKey(reference);
  };
  const referenceListKeys = (value, label, allowDuplicates = false) => {
    if (!Array.isArray(value)) throw new Error(`${label} is not an exact source-reference array.`);
    const keys = value.map((reference, index) => exactReferenceKey(reference, `${label}[${index}]`));
    if (!allowDuplicates && new Set(keys).size !== keys.length) throw new Error(`${label} contains duplicate source identities.`);
    return [...keys].sort();
  };
  const pointerKey = (value, label, nullable = false) => {
    if (value === null || value === undefined) {
      if (nullable) return null;
      throw new Error(`${label} is missing its exact source pointer.`);
    }
    if (typeof value !== 'object' || typeof value.file !== 'string' || !value.file
      || typeof value.pathId !== 'string' || !value.pathId || typeof value.name !== 'string' || !value.name) {
      throw new Error(`${label} is not an exact source pointer.`);
    }
    return `${value.file.replaceAll('\\', '/').toLowerCase()}:${value.pathId}:${value.name.trim()}`;
  };
  const pointerListKeys = (value, label) => {
    if (!Array.isArray(value)) throw new Error(`${label} is not an exact source-pointer array.`);
    const keys = value.map((pointer, index) => pointerKey(pointer, `${label}[${index}]`));
    if (new Set(keys).size !== keys.length) throw new Error(`${label} contains duplicate source pointers.`);
    return keys;
  };
  const exactPointerSourceKey = (value, label, expectedSourceReference = null) => {
    const key = pointerKey(value, label);
    const sourceReference = value?.sourceReference;
    const sourceKey = exactReferenceKey(sourceReference, `${label} source reference`);
    if (sourceReference.objectId !== value.pathId
      || normalizedSourceSerializedFile(sourceReference.serializedFile)
        !== normalizedSourceSerializedFile(value.file)) {
      throw new Error(`${label} source reference does not match its serialized pointer.`);
    }
    if (expectedSourceReference
      && (sourceReference.bundleSha256.toLowerCase() !== expectedSourceReference.bundleSha256.toLowerCase()
        || normalizedSourceSerializedFile(sourceReference.serializedFile)
          !== normalizedSourceSerializedFile(expectedSourceReference.serializedFile))) {
      throw new Error(`${label} source reference crosses the selected source prefab.`);
    }
    return `${sourceKey}:${key}`;
  };
  const sourceContainerMatches = (left, right) => Boolean(left && right
    && typeof left.bundleSha256 === 'string' && typeof right.bundleSha256 === 'string'
    && left.bundleSha256.toLowerCase() === right.bundleSha256.toLowerCase()
    && normalizedSourceSerializedFile(left.serializedFile) === normalizedSourceSerializedFile(right.serializedFile));
  const attachmentKeys = new Set();
  const attachmentPointers = [];
  const authoredWeaponPointers = [];
  const attachments = profile?.assembly?.attachments ?? {};
  for (const key of ["equipmentRendererReferences", "weaponRendererReferences", "mainWeaponRendererReferences", "subWeaponRendererReferences", "accessoryRendererReferences"]) {
    const values = attachments[key];
    if (values === undefined) continue;
    if (!Array.isArray(values)) throw new Error(`Rendering profile attachment ${key} is not an array.`);
    values.forEach((reference, index) => attachmentKeys.add(exactReferenceKey(reference, `Attachment ${key}[${index}]`)));
  }
  for (const key of ["mainWeapon", "subWeapon"]) {
    const values = attachments[key];
    if (values === undefined) continue;
    attachmentPointers.push(...pointerListKeys(values, `Attachment ${key}`));
    authoredWeaponPointers.push(...values.map((pointer, index) => ({
      kind: key,
      index,
      pointer,
    })));
  }
  const assemblyByReference = new Map();
  for (const assemblyRenderer of profile?.assembly?.renderers ?? []) {
    const sourceKey = sourceReferenceKey(assemblyRenderer?.sourceReference);
    if (!sourceKey) continue;
    const records = assemblyByReference.get(sourceKey) ?? [];
    records.push(assemblyRenderer);
    assemblyByReference.set(sourceKey, records);
  }
  const sortedEvidence = [...evidence].sort((left, right) =>
    sourceReferenceKey(left?.sourceReference).localeCompare(sourceReferenceKey(right?.sourceReference))
      || String(left?.classification ?? '').localeCompare(String(right?.classification ?? ''))
      || String(left?.reasonCode ?? '').localeCompare(String(right?.reasonCode ?? '')));
  if (stableProfileValue(evidence) !== stableProfileValue(sortedEvidence)) {
    throw new Error("Rendering profile equipment-binding evidence is not in deterministic source order.");
  }
  const seenEvidence = new Set();
  const blockerKeys = new Set((blockers ?? []).map((blocker, index) => exactReferenceKey(blocker?.sourceReference, `Core renderer blocker ${index}`)));
  const excludedKeys = new Set((profile.excludedRenderers ?? []).map((renderer) => sourceReferenceKey(renderer?.sourceReference)));
  for (const [index, record] of evidence.entries()) {
    if (!record || typeof record !== 'object') throw new Error(`Rendering profile equipment-binding evidence ${index} is not a record.`);
    const sourceKey = exactReferenceKey(record.sourceReference, `Equipment-binding evidence ${index}`);
    if (seenEvidence.has(sourceKey)) throw new Error(`Rendering profile equipment-binding evidence is duplicated for ${sourceKey}.`);
    seenEvidence.add(sourceKey);
    const expectedReasonCode = record.classification === "exact-equipment-renderer"
      ? "EXACT_EQUIPMENT_RENDERER_REFERENCE"
      : record.classification === "exact-main-sub-equipment"
        ? "EXACT_MAIN_SUB_ATTACHMENT_POINTER"
        : record.classification === "structurally-bound-equipment"
          ? new Set(["STRUCTURAL_TRANSFORM_BONE_ANCESTRY", "EXACT_SOURCE_WEAPON_ANCESTRY"]) : null;
    const reasonCodeValid = expectedReasonCode instanceof Set
      ? expectedReasonCode.has(record.reasonCode)
      : record.reasonCode === expectedReasonCode;
    if (!expectedReasonCode || !reasonCodeValid
      || typeof record.reason !== 'string' || !record.reason
      || typeof record.name !== 'string' || !record.name
      || (record.hierarchyPath !== null && typeof record.hierarchyPath !== 'string')
      || !Array.isArray(record.evidence) || record.evidence.length === 0
      || record.evidence.some((item) => typeof item !== 'string' || !item)) {
      throw new Error(`Rendering profile equipment-binding evidence ${sourceKey} is incomplete or has an invalid classification.`);
    }
    if (excludedKeys.has(sourceKey) || blockerKeys.has(sourceKey)
      || !(profile.renderers ?? []).some((renderer) => sourceReferenceKey(renderer?.sourceReference) === sourceKey)) {
      throw new Error(`Rendering profile equipment-binding evidence ${sourceKey} conflicts with core/excluded renderer classification.`);
    }
    const renderer = (profile.renderers ?? []).find((item) => sourceReferenceKey(item?.sourceReference) === sourceKey);
    const assemblyMatches = assemblyByReference.get(sourceKey) ?? [];
    if (!renderer || assemblyMatches.length !== 1) {
      throw new Error(`Rendering profile equipment-binding evidence ${sourceKey} does not identify exactly one core renderer and source assembly renderer.`);
    }
    const assemblyRenderer = assemblyMatches[0];
    if (renderer.name !== record.name || (renderer.hierarchyPath ?? null) !== record.hierarchyPath
      || assemblyRenderer.name !== record.name || (assemblyRenderer.hierarchyPath ?? null) !== record.hierarchyPath) {
      throw new Error(`Rendering profile equipment-binding evidence ${sourceKey} disagrees with its exact renderer identity.`);
    }
    if (record.classification === "structurally-bound-equipment"
      && (renderer.rendererType !== "SkinnedMeshRenderer" || assemblyRenderer.rendererType !== "SkinnedMeshRenderer")) {
      throw new Error(`Rendering profile structural equipment evidence ${sourceKey} is not backed by source/exported skinned renderers.`);
    }
    const evidenceMaterialKeys = referenceListKeys(record.sourceMaterialReferences, `Equipment-binding evidence ${sourceKey} source materials`, true);
    const evidenceShaderKeys = referenceListKeys(record.sourceShaderReferences, `Equipment-binding evidence ${sourceKey} source shaders`, true);
    const rendererMaterialKeys = referenceListKeys((renderer.materialSlots ?? []).map((slot) => slot?.sourceMaterialReference).filter(Boolean), `Core renderer ${sourceKey} source materials`, true);
    const rendererShaderKeys = referenceListKeys((renderer.materialSlots ?? []).map((slot) => slot?.sourceShaderReference).filter(Boolean), `Core renderer ${sourceKey} source shaders`, true);
    if (stableProfileValue(evidenceMaterialKeys) !== stableProfileValue(rendererMaterialKeys)
      || stableProfileValue(evidenceShaderKeys) !== stableProfileValue(rendererShaderKeys)) {
      throw new Error(`Rendering profile equipment evidence ${sourceKey} disagrees with core material or shader identities.`);
    }
    if (record.classification === "structurally-bound-equipment"
      && (!evidenceMaterialKeys.length || !evidenceShaderKeys.length)) {
      throw new Error(`Rendering profile structural equipment evidence ${sourceKey} disagrees with core material or shader identities.`);
    }
    const sourceMeshKey = record.sourceMeshReference === null || record.sourceMeshReference === undefined
      ? null : exactReferenceKey(record.sourceMeshReference, `Equipment-binding evidence ${sourceKey} source mesh`);
    const rendererMeshKey = renderer.sourceMesh?.sourceReference
      ? exactReferenceKey(renderer.sourceMesh.sourceReference, `Core renderer ${sourceKey} source mesh`) : null;
    const assemblyMeshKey = assemblyRenderer.meshSourceReference
      ? exactReferenceKey(assemblyRenderer.meshSourceReference, `Assembly renderer ${sourceKey} source mesh`) : null;
    if (record.classification === "structurally-bound-equipment") {
      if (!sourceMeshKey || sourceMeshKey !== rendererMeshKey || sourceMeshKey !== assemblyMeshKey) {
        throw new Error(`Rendering profile structural equipment evidence ${sourceKey} disagrees with source mesh identity.`);
      }
      if (!renderer.sourceMesh || !assemblyRenderer.mesh
        || assemblyRenderer.mesh.pathId !== record.sourceMeshReference.objectId
        || String(assemblyRenderer.mesh.file ?? '').replaceAll('\\', '/').toLowerCase()
          !== String(record.sourceMeshReference.serializedFile).replaceAll('\\', '/').toLowerCase()) {
        throw new Error(`Rendering profile structural equipment evidence ${sourceKey} disagrees with source mesh pointer identity.`);
      }
      if (attachmentKeys.has(sourceKey)) throw new Error(`Rendering profile structural equipment evidence ${sourceKey} duplicates an exact equipment attachment.`);
      const rootBone = pointerKey(record.rootBone, `Rendering profile structural equipment evidence ${sourceKey} rootBone`);
      const assemblyRootBone = pointerKey(assemblyRenderer.rootBone, `Assembly renderer ${sourceKey} rootBone`);
      const transformChain = pointerListKeys(record.transformChain, `Rendering profile structural equipment evidence ${sourceKey} transformChain`);
      const assemblyTransformChain = pointerListKeys(assemblyRenderer.transformChain ?? [], `Assembly renderer ${sourceKey} transformChain`);
      const boneReferences = pointerListKeys(record.boneReferences, `Rendering profile structural equipment evidence ${sourceKey} boneReferences`);
      const assemblyBoneReferences = pointerListKeys(assemblyRenderer.boneReferences ?? [], `Assembly renderer ${sourceKey} boneReferences`);
      if (!transformChain.length || !boneReferences.length || rootBone !== assemblyRootBone
        || stableProfileValue(transformChain) !== stableProfileValue(assemblyTransformChain)
        || stableProfileValue(boneReferences) !== stableProfileValue(assemblyBoneReferences)) {
        throw new Error(`Rendering profile structural equipment evidence ${sourceKey} disagrees with source transform/bone identities.`);
      }
      const matchedAncestors = pointerListKeys(record.matchedAncestorPointers, `Rendering profile structural equipment evidence ${sourceKey} matched ancestors`);
      const exactSourceWeaponAncestry = record.reasonCode === 'EXACT_SOURCE_WEAPON_ANCESTRY';
      const sourcePointers = new Set([rootBone, ...transformChain, ...boneReferences]);
      if (!matchedAncestors.length || (!exactSourceWeaponAncestry && matchedAncestors.some((pointer) => !sourcePointers.has(pointer)))) {
        throw new Error(`Rendering profile structural equipment evidence ${sourceKey} has an invalid matched ancestor.`);
      }
      if (exactSourceWeaponAncestry) {
        const exactWeaponBodyClaim = 'body m_Bones overlap: none or non-conflicting; exact source weapon ancestry remains unique';
        const exactWeaponUniquenessClaim = 'unique non-conflicting full-source weapon ancestor relation';
        if (!record.evidence.includes(exactWeaponBodyClaim)
          || !record.evidence.includes(exactWeaponUniquenessClaim)) {
          throw new Error(`Rendering profile exact source weapon ancestry evidence ${sourceKey} is missing its exact source claims.`);
        }
        const sourceReference = record.sourceReference;
        const prefabReference = profile.assembly?.prefabReference;
        if (!prefabReference) {
          throw new Error(`Rendering profile exact source weapon ancestry evidence ${sourceKey} has no exact selected source prefab identity.`);
        }
        exactReferenceKey(prefabReference, `Selected source prefab for ${sourceKey}`);
        if (!sourceContainerMatches(sourceReference, prefabReference)) {
          throw new Error(`Rendering profile exact source weapon ancestry evidence ${sourceKey} crosses the selected source prefab.`);
        }
        if (assemblyRenderer.rootBoneAncestryComplete !== true
          || !Array.isArray(assemblyRenderer.rootBoneAncestry)
          || !assemblyRenderer.rootBoneAncestry.length
          || !Array.isArray(record.rootBoneAncestry)
          || !record.rootBoneAncestry.length) {
          throw new Error(`Rendering profile exact source weapon ancestry evidence ${sourceKey} has incomplete rootBone ancestry.`);
        }
        exactPointerSourceKey(
          assemblyRenderer.rootBone,
          `Assembly renderer ${sourceKey} rootBone`,
          sourceReference,
        );
        if (pointerKey(assemblyRenderer.rootBone, `Assembly renderer ${sourceKey} rootBone`)
          !== rootBone) {
          throw new Error(`Rendering profile exact source weapon ancestry evidence ${sourceKey} disagrees with its exact rootBone identity.`);
        }
        const assemblyAncestryKeys = assemblyRenderer.rootBoneAncestry.map((pointer, pointerIndex) =>
          exactPointerSourceKey(pointer, `Assembly renderer ${sourceKey} rootBoneAncestry[${pointerIndex}]`, sourceReference));
        const evidenceAncestryKeys = record.rootBoneAncestry.map((pointer, pointerIndex) =>
          exactPointerSourceKey(pointer, `Rendering profile exact source weapon ancestry evidence ${sourceKey} rootBoneAncestry[${pointerIndex}]`, sourceReference));
        const assemblyAncestrySourceKeys = assemblyRenderer.rootBoneAncestry.map((pointer) => sourceReferenceKey(pointer.sourceReference));
        const evidenceAncestrySourceKeys = record.rootBoneAncestry.map((pointer) => sourceReferenceKey(pointer.sourceReference));
        if (new Set(assemblyAncestrySourceKeys).size !== assemblyAncestrySourceKeys.length
          || new Set(evidenceAncestrySourceKeys).size !== evidenceAncestrySourceKeys.length
          || stableProfileValue(assemblyAncestryKeys) !== stableProfileValue(evidenceAncestryKeys)) {
          throw new Error(`Rendering profile exact source weapon ancestry evidence ${sourceKey} disagrees with selected assembly rootBone ancestry.`);
        }
        const authoredPointerKeys = authoredWeaponPointers.map(({ kind, index, pointer }) => ({
          sourceKey: sourceReferenceKey(pointer.sourceReference),
          exactKey: exactPointerSourceKey(pointer, `Attachment ${kind}[${index}]`, sourceReference),
        }));
        if (!authoredPointerKeys.length
          || new Set(authoredPointerKeys.map((item) => item.sourceKey)).size !== authoredPointerKeys.length) {
          throw new Error(`Rendering profile exact source weapon ancestry evidence ${sourceKey} has duplicate authored mainWeapon/subWeapon pointers.`);
        }
        const ancestryMatches = assemblyAncestryKeys.flatMap((ancestorKey, ancestorIndex) => {
          const matches = authoredPointerKeys.flatMap((attachment, attachmentIndex) =>
            attachment.exactKey === ancestorKey ? [attachmentIndex] : []);
          return matches.length ? [{ ancestorIndex, matches }] : [];
        });
        if (ancestryMatches.length !== 1 || ancestryMatches[0].matches.length !== 1) {
          throw new Error(`Rendering profile exact source weapon ancestry evidence ${sourceKey} does not identify exactly one authored mainWeapon/subWeapon ancestor.`);
        }
        const matchedEvidenceKeys = record.matchedAncestorPointers.map((pointer, pointerIndex) => {
          const pointerLabel = `Rendering profile exact source weapon ancestry evidence ${sourceKey} matched ancestor ${pointerIndex}`;
          if (pointer?.sourceReference) {
            exactPointerSourceKey(pointer, pointerLabel, sourceReference);
          }
          return pointerKey(pointer, pointerLabel);
        });
        const matchedAssemblyKey = assemblyRenderer.rootBoneAncestry[ancestryMatches[0].ancestorIndex];
        const matchedAssemblyPointerKey = pointerKey(matchedAssemblyKey, `Assembly renderer ${sourceKey} matched ancestor`);
        if (matchedEvidenceKeys.length !== 1 || matchedEvidenceKeys[0] !== matchedAssemblyPointerKey) {
          throw new Error(`Rendering profile exact source weapon ancestry evidence ${sourceKey} has an invalid matched ancestor.`);
        }
      }
      const bodyKeys = referenceListKeys(record.bodyRendererReferences, `Rendering profile structural equipment evidence ${sourceKey} body renderers`);
      const noBodyOverlapClaim = record.evidence.includes('body m_Bones overlap: none; source hierarchy independently corroborates movement')
        || (record.evidence.includes('body m_Bones overlap: none; exact authored equipment m_Bones relation independently corroborates movement')
          && record.evidence.includes('unique non-conflicting same-prefab shared m_Bones relation'))
        || (record.evidence.includes('body m_Bones overlap: none or non-conflicting; exact source weapon ancestry remains unique')
          && record.evidence.includes('unique non-conflicting full-source weapon ancestor relation'));
      const invalidBodyRenderer = bodyKeys.some((bodyKey) => {
        const bodyRenderer = (profile.renderers ?? []).find((renderer) => sourceReferenceKey(renderer?.sourceReference) === bodyKey);
        const bodyAssemblyMatches = assemblyByReference.get(bodyKey) ?? [];
        return bodyKey === sourceKey || !(profile.renderers ?? []).some((renderer) => sourceReferenceKey(renderer?.sourceReference) === bodyKey)
          || excludedKeys.has(bodyKey) || blockerKeys.has(bodyKey)
          || bodyRenderer?.rendererType !== "SkinnedMeshRenderer"
          || bodyAssemblyMatches.length !== 1 || bodyAssemblyMatches[0]?.rendererType !== "SkinnedMeshRenderer";
      });
      if ((!bodyKeys.length && !noBodyOverlapClaim) || invalidBodyRenderer) {
        throw new Error(`Rendering profile structural equipment evidence ${sourceKey} has an invalid body-renderer relation.`);
      }
    } else {
      if (sourceMeshKey !== rendererMeshKey
        || (assemblyMeshKey && assemblyMeshKey !== sourceMeshKey)) {
        throw new Error(`Rendering profile equipment evidence ${sourceKey} disagrees with its core source mesh identity.`);
      }
      if (sourceMeshKey && (!renderer.sourceMesh
        || renderer.sourceMesh.pathId !== record.sourceMeshReference.objectId
        || String(renderer.sourceMesh.file ?? '').replaceAll('\\', '/').toLowerCase()
          !== String(record.sourceMeshReference.serializedFile).replaceAll('\\', '/').toLowerCase()
        || (assemblyRenderer.mesh && (assemblyRenderer.mesh.pathId !== record.sourceMeshReference.objectId
          || String(assemblyRenderer.mesh.file ?? '').replaceAll('\\', '/').toLowerCase()
            !== String(record.sourceMeshReference.serializedFile).replaceAll('\\', '/').toLowerCase())))) {
        throw new Error(`Rendering profile equipment evidence ${sourceKey} disagrees with its source mesh pointer identity.`);
      }
    }
    if (record.classification === "exact-equipment-renderer" && !attachmentKeys.has(sourceKey)) {
      throw new Error(`Rendering profile exact equipment evidence ${sourceKey} is not backed by an exact equipment renderer reference.`);
    }
    if (record.classification === "exact-main-sub-equipment") {
      const relationPointers = [record.rootBone, ...(record.transformChain ?? []), ...(record.boneReferences ?? [])]
        .filter((pointer) => pointer !== null && pointer !== undefined)
        .map((pointer, pointerIndex) => pointerKey(pointer, `Rendering profile exact equipment evidence ${sourceKey} pointer ${pointerIndex}`));
      if (!relationPointers.some((pointer) => attachmentPointers.includes(pointer))) {
        throw new Error(`Rendering profile exact main/sub equipment evidence ${sourceKey} has no exact attachment pointer relation.`);
      }
    }
  }
  return { evidence: Array.isArray(evidence) ? evidence : [], blockers: Array.isArray(blockers) ? blockers : [], present: true };
}

function profilePolicyDiagnostics(profile) {
  const exclusions = Array.isArray(profile.excludedRenderers) ? profile.excludedRenderers : [];
  const excludedEvents = Array.isArray(profile.excludedChildRendererEvents) ? profile.excludedChildRendererEvents : [];
  const validationExclusions = profile.validation?.excludedRenderers;
  const validationExcludedEvents = profile.validation?.excludedChildRendererEvents;
  const requiresFxContract = profile.profileVersion === CURRENT_RENDERING_PROFILE_VERSION
    || profile.policyVersion === CURRENT_RENDERING_POLICY_VERSION;
  const fxProofs = profile.fxExclusionProofs;
  const fxEvents = profile.excludedFxInstantiationEvents;
  const validationFxProofs = profile.validation?.fxExclusionProofs;
  const validationFxEvents = profile.validation?.excludedFxInstantiationEvents;
  if (requiresFxContract && (!Array.isArray(fxProofs) || !Array.isArray(fxEvents)
    || !Array.isArray(validationFxProofs) || !Array.isArray(validationFxEvents))) {
    throw new Error('Rendering profile v14 is missing proof-backed InstantiateFx exclusion records.');
  }
  if ((Array.isArray(fxProofs) && fxProofs.length || Array.isArray(fxEvents) && fxEvents.length)
    && (!Array.isArray(validationFxProofs) || !Array.isArray(validationFxEvents))) {
    throw new Error('Rendering profile FX exclusions are missing validation records.');
  }
  // New profiles duplicate policy records under validation so import can audit
  // them without trusting a renderer list alone.  Older profile fixtures with
  // no exclusions remain readable; a non-empty exclusion list must carry both
  // copies and they must match exactly.
  if (exclusions.length && !Array.isArray(validationExclusions)) {
    throw new Error('Rendering profile exclusions are missing validation records.');
  }
  if (excludedEvents.length && !Array.isArray(validationExcludedEvents)) {
    throw new Error('Rendering profile excluded child-renderer events are missing validation records.');
  }
  if (Array.isArray(validationExclusions)
    && validationExclusions.length !== exclusions.length) {
    throw new Error('Rendering profile exclusion records disagree with validation records.');
  }
  if (Array.isArray(validationExcludedEvents)
    && validationExcludedEvents.length !== excludedEvents.length) {
    throw new Error('Rendering profile excluded child-renderer events disagree with validation records.');
  }
  const sortedExclusions = [...exclusions].sort((left, right) => {
    const leftKey = sourceReferenceKey(left?.sourceReference);
    const rightKey = sourceReferenceKey(right?.sourceReference);
    return leftKey.localeCompare(rightKey) || String(left?.hierarchyPath ?? '').localeCompare(String(right?.hierarchyPath ?? ''));
  });
  const sortedExcludedEvents = [...excludedEvents].sort((left, right) =>
    Number(left?.time ?? 0) - Number(right?.time ?? 0)
      || Number(left?.order ?? 0) - Number(right?.order ?? 0)
      || sourceReferenceKey(left?.sourceRendererReference).localeCompare(sourceReferenceKey(right?.sourceRendererReference))
      || String(left?.clip ?? '').localeCompare(String(right?.clip ?? '')),
  );
  const sortedFxProofs = [...(Array.isArray(fxProofs) ? fxProofs : [])].sort((left, right) =>
    Number(left?.time ?? 0) - Number(right?.time ?? 0)
      || Number(left?.order ?? 0) - Number(right?.order ?? 0)
      || sourceReferenceKey(left?.eventSourceReference).localeCompare(sourceReferenceKey(right?.eventSourceReference))
      || sourceReferenceKey(left?.targetReference).localeCompare(sourceReferenceKey(right?.targetReference)),
  );
  const sortedFxEvents = [...(Array.isArray(fxEvents) ? fxEvents : [])].sort((left, right) =>
    Number(left?.time ?? 0) - Number(right?.time ?? 0)
      || Number(left?.order ?? 0) - Number(right?.order ?? 0)
      || sourceReferenceKey(left?.eventSourceReference).localeCompare(sourceReferenceKey(right?.eventSourceReference))
      || sourceReferenceKey(left?.targetReference).localeCompare(sourceReferenceKey(right?.targetReference)),
  );
  if (Array.isArray(validationExclusions)) {
    const expected = sortedExclusions.map(canonicalExcludedRenderer);
    const actual = [...validationExclusions].sort((left, right) =>
      sourceReferenceKey(left?.sourceReference).localeCompare(sourceReferenceKey(right?.sourceReference))
        || String(left?.hierarchyPath ?? '').localeCompare(String(right?.hierarchyPath ?? '')),
    ).map(canonicalExcludedRenderer);
    if (expected.length !== actual.length || expected.some((record, index) => !compareCanonicalRecords(record, actual[index]))) {
      throw new Error('Rendering profile exclusion records disagree with validation records.');
    }
  }
  if (Array.isArray(validationExcludedEvents)) {
    const expected = sortedExcludedEvents.map(canonicalExcludedEvent);
    const actual = [...validationExcludedEvents].sort((left, right) =>
      Number(left?.time ?? 0) - Number(right?.time ?? 0)
        || Number(left?.order ?? 0) - Number(right?.order ?? 0)
        || sourceReferenceKey(left?.sourceRendererReference).localeCompare(sourceReferenceKey(right?.sourceRendererReference)),
    ).map(canonicalExcludedEvent);
    if (expected.length !== actual.length || expected.some((record, index) => !compareCanonicalRecords(record, actual[index]))) {
      throw new Error('Rendering profile excluded child-renderer events disagree with validation records.');
    }
  }
  if (Array.isArray(validationFxProofs) && stableProfileValue(sortedFxProofs) !== stableProfileValue([...validationFxProofs].sort((left, right) =>
    Number(left?.time ?? 0) - Number(right?.time ?? 0)
      || Number(left?.order ?? 0) - Number(right?.order ?? 0)
      || sourceReferenceKey(left?.eventSourceReference).localeCompare(sourceReferenceKey(right?.eventSourceReference))
      || sourceReferenceKey(left?.targetReference).localeCompare(sourceReferenceKey(right?.targetReference)),
  ))) {
    throw new Error('Rendering profile FX proof records disagree with validation records.');
  }
  if (Array.isArray(validationFxEvents) && stableProfileValue(sortedFxEvents) !== stableProfileValue([...validationFxEvents].sort((left, right) =>
    Number(left?.time ?? 0) - Number(right?.time ?? 0)
      || Number(left?.order ?? 0) - Number(right?.order ?? 0)
      || sourceReferenceKey(left?.eventSourceReference).localeCompare(sourceReferenceKey(right?.eventSourceReference))
      || sourceReferenceKey(left?.targetReference).localeCompare(sourceReferenceKey(right?.targetReference)),
  ))) {
    throw new Error('Rendering profile excluded FX InstantiateFx events disagree with validation records.');
  }
  if (sortedFxProofs.length !== sortedFxEvents.length) {
    throw new Error('Rendering profile FX proofs and excluded InstantiateFx events are not one-to-one.');
  }
  const fxIdentities = new Set();
  const { sourceKeys: coreFxSourceKeys, pointerKeys: coreFxPointerKeys } = coreFxIdentitySets(profile);
  const eventsByIdentity = new Map();
  for (const [index, event] of sortedFxEvents.entries()) {
    const key = fxEventIdentityKey(event, `Rendering profile excluded FX event ${index}`);
    if (eventsByIdentity.has(key)) throw new Error(`Rendering profile excluded FX event ${key} is duplicated.`);
    if (!FX_INSTANTIATE_EVENT_FUNCTIONS.has(event.function) || event.reasonCode !== 'PRESENTATION_FX_INSTANTIATION'
      || !Array.isArray(event.evidence) || event.evidence.length === 0
      || event.evidence.some(item => typeof item !== 'string' || !item)) {
      throw new Error(`Rendering profile excluded FX event ${key} has invalid source evidence or reason.`);
    }
    eventsByIdentity.set(key, event);
  }
  for (const proof of sortedFxProofs) {
    const key = validateFxExclusionProof(proof, coreFxSourceKeys, coreFxPointerKeys);
    if (fxIdentities.has(key)) throw new Error(`Rendering profile FX proof ${key} is duplicated.`);
    fxIdentities.add(key);
    const event = eventsByIdentity.get(key);
    if (!event || event.function !== proof.function || event.reasonCode !== 'PRESENTATION_FX_INSTANTIATION'
      || event.clip !== proof.clip || event.time !== proof.time || event.order !== proof.order
      || sourceReferenceKey(event.eventSourceReference) !== sourceReferenceKey(proof.eventSourceReference)
      || sourceReferenceKey(event.targetReference) !== sourceReferenceKey(proof.targetReference)
      || stableProfileValue(event.evidence) !== stableProfileValue(proof.evidence)) {
      throw new Error(`Rendering profile FX proof ${key} does not map one-to-one to its excluded InstantiateFx diagnostic.`);
    }
  }
  if (fxIdentities.size !== eventsByIdentity.size) {
    throw new Error('Rendering profile has an excluded InstantiateFx event without its exact source proof.');
  }
  profile.excludedRenderers = sortedExclusions;
  profile.excludedChildRendererEvents = sortedExcludedEvents;
  profile.fxExclusionProofs = sortedFxProofs;
  profile.excludedFxInstantiationEvents = sortedFxEvents;
  if (profile.validation && Array.isArray(profile.validation.excludedRenderers)) {
    profile.validation.excludedRenderers = sortedExclusions;
  }
  if (profile.validation && Array.isArray(profile.validation.excludedChildRendererEvents)) {
    profile.validation.excludedChildRendererEvents = sortedExcludedEvents;
  }
  if (profile.validation && Array.isArray(profile.validation.fxExclusionProofs)) {
    profile.validation.fxExclusionProofs = sortedFxProofs;
  }
  if (profile.validation && Array.isArray(profile.validation.excludedFxInstantiationEvents)) {
    profile.validation.excludedFxInstantiationEvents = sortedFxEvents;
  }
  return { exclusions: sortedExclusions, excludedEvents: sortedExcludedEvents, fxExclusionProofs: sortedFxProofs, excludedFxInstantiationEvents: sortedFxEvents };
}

function embedRenderingProfileDiagnostics(diagnostics) {
  const scene = json.scenes?.[Number.isInteger(json.scene) ? json.scene : 0];
  if (!scene) throw new Error('Rendering profile diagnostics cannot be embedded because the GLB has no selected scene.');
  scene.extras = {
    ...scene.extras,
    chibi: {
      ...scene.extras?.chibi,
      renderingProfileDiagnostics: diagnostics,
    },
  };
}

function bindRenderingProfile(profile) {
  if (!profile?.validation?.valid) throw new Error(`Source rendering profile is invalid: ${(profile?.validation?.unresolved ?? []).join(' ')}`);
  const paths = nodeHierarchyPaths(), usedNodes = new Map(), usedSourceRenderers = new Map();
  const policy = profilePolicyDiagnostics(profile);
  const equipment = validateEquipmentBindingEvidence(profile);
  const excludedBySource = new Map();
  const excludedNodeClaims = new Map();
  const excludedNodeDiagnostics = [];
  const coreSourceKeys = new Set((profile.renderers ?? []).map((renderer) => sourceReferenceKey(renderer?.sourceReference)));
  const coreMaterialKeys = new Set((profile.renderers ?? []).flatMap((renderer) =>
    (renderer.materialSlots ?? []).map((slot) => sourceReferenceKey(slot?.sourceMaterialReference)).filter(Boolean)));
  const attachmentEvidence = assemblyAttachmentEvidence(profile.assembly);
  for (const exclusion of policy.exclusions) {
    if (!exclusion || typeof exclusion !== 'object') throw new Error('Rendering profile has an invalid presentation exclusion record.');
    const sourceKey = exactSourceReferenceKey(exclusion.sourceReference, `Excluded renderer ${exclusion.name ?? '(unnamed)'}`);
    if (excludedBySource.has(sourceKey)) throw new Error(`Presentation exclusion ${sourceKey} is recorded more than once.`);
    if (coreSourceKeys.has(sourceKey)) throw new Error(`Renderer ${sourceKey} is both core and presentation-excluded.`);
    if (typeof exclusion.name !== 'string' || !exclusion.name
      || (exclusion.hierarchyPath !== null && typeof exclusion.hierarchyPath !== 'string')
      || (typeof exclusion.hierarchyPath === 'string' && !exclusion.hierarchyPath)
      || !PRESENTATION_EXCLUSION_REASON_CODES.has(exclusion.reasonCode)
      || !Array.isArray(exclusion.evidence) || exclusion.evidence.length === 0
      || exclusion.evidence.some((evidence) => typeof evidence !== 'string' || !evidence)
      || !Array.isArray(exclusion.materials)) {
      throw new Error(`Presentation exclusion ${sourceKey} is not a complete structured source-evidence record.`);
    }
    if (!profile.assembly || !Array.isArray(profile.assembly.renderers)) {
      throw new Error(`Presentation exclusion ${sourceKey} has no exact source assembly evidence.`);
    }
    const assemblyMatches = profile.assembly.renderers.filter((renderer) => sourceReferenceKey(renderer?.sourceReference) === sourceKey);
    if (assemblyMatches.length !== 1) throw new Error(`Presentation exclusion ${sourceKey} does not match exactly one source assembly renderer.`);
    const assemblyRenderer = assemblyMatches[0];
    if (assemblyRenderer.name !== exclusion.name
      || (assemblyRenderer.hierarchyPath ?? null) !== (exclusion.hierarchyPath ?? null)) {
      throw new Error(`Presentation exclusion ${sourceKey} does not match its source assembly renderer.`);
    }
    if (attachmentEvidence.references.has(sourceKey)) {
      throw new Error(`Presentation exclusion ${sourceKey} may omit required character or equipment content.`);
    }
    verifyExclusionEvidence(exclusion, assemblyRenderer, sourceKey, coreMaterialKeys);
    const matches = exclusion.hierarchyPath === null ? [] : (json.nodes ?? []).flatMap((node, index) =>
      Number.isInteger(node.mesh) && paths[index] === exclusion.hierarchyPath ? [index] : []);
    if (matches.length > 1) throw new Error(`Presentation exclusion ${exclusion.hierarchyPath} maps to ${matches.length} GLB nodes; expected at most one.`);
    if (matches.length === 1) {
      const nodeIndex = matches[0];
      if (excludedNodeClaims.has(nodeIndex)) throw new Error(`GLB node ${exclusion.hierarchyPath} is claimed by multiple presentation exclusions.`);
      excludedNodeClaims.set(nodeIndex, sourceKey);
      excludedNodeDiagnostics.push({
        sourceReference: exclusion.sourceReference,
        name: exclusion.name,
        hierarchyPath: exclusion.hierarchyPath,
        nodeIndex,
        nodeName: json.nodes[nodeIndex].name ?? '',
        status: 'intentionally-excluded',
        reasonCode: exclusion.reasonCode,
        evidence: [...exclusion.evidence],
      });
    } else {
      excludedNodeDiagnostics.push({
        sourceReference: exclusion.sourceReference,
        name: exclusion.name,
        hierarchyPath: exclusion.hierarchyPath,
        nodeIndex: null,
        nodeName: null,
        status: 'source-node-omitted',
        reasonCode: exclusion.reasonCode,
        evidence: [...exclusion.evidence],
      });
    }
    excludedBySource.set(sourceKey, exclusion);
  }
  const excludedChildRendererEvents = [];
  const excludedEventKeys = new Set();
  for (const event of policy.excludedEvents) {
    const sourceKey = exactSourceReferenceKey(event?.sourceRendererReference, 'Excluded child-renderer event');
    const targetExclusion = excludedBySource.get(sourceKey);
    if (!targetExclusion) throw new Error(`Excluded child-renderer event targets a renderer without an exact presentation exclusion: ${sourceKey}.`);
    if (typeof event.clip !== 'string' || !event.clip || !Number.isFinite(event.time)
      || !Number.isInteger(event.order) || (event.action !== 'enable' && event.action !== 'disable')
      || event.reasonCode !== 'PRESENTATION_CHILD_RENDERER_EVENT'
      || !Array.isArray(event.evidence) || event.evidence.length === 0
      || event.evidence.some((evidence) => typeof evidence !== 'string' || !evidence)) {
      throw new Error(`Excluded child-renderer event ${sourceKey} is not a complete structured source-evidence record.`);
    }
    const exactEventClaim = `event target exactly matches excluded renderer ${sourceKey}`;
    if (!event.evidence.includes(exactEventClaim)) {
      throw new Error(`Excluded child-renderer event ${sourceKey} is missing its exact source target evidence.`);
    }
    const exclusionEvidence = new Set(targetExclusion.evidence);
    for (const evidence of event.evidence) {
      if (evidence !== exactEventClaim && !exclusionEvidence.has(evidence)) {
        throw new Error(`Excluded child-renderer event ${sourceKey} has unknown or mixed source evidence: ${evidence}`);
      }
    }
    const eventKey = `${event.clip}\u0000${event.time}\u0000${event.action}\u0000${sourceKey}\u0000${event.order}`;
    if (excludedEventKeys.has(eventKey)) throw new Error(`Excluded child-renderer event ${sourceKey} is recorded more than once.`);
    excludedEventKeys.add(eventKey);
    excludedChildRendererEvents.push({ ...event, sourceRendererReference: event.sourceRendererReference, evidence: [...event.evidence] });
  }
  const coreEventKeys = new Set();
  for (const event of profile.childRendererEvents ?? []) {
    const sourceKey = exactSourceReferenceKey(event?.sourceRendererReference, 'Child-renderer event');
    if (excludedBySource.has(sourceKey)) throw new Error(`Child-renderer event targets an excluded presentation renderer: ${sourceKey}.`);
    if (!coreSourceKeys.has(sourceKey)) throw new Error(`Child-renderer event targets a source renderer that is not core-bound: ${sourceKey}.`);
    if (typeof event.clip !== 'string' || !event.clip || !Number.isFinite(event.time)
      || !Number.isInteger(event.order) || (event.action !== 'enable' && event.action !== 'disable')) {
      throw new Error(`Child-renderer event ${sourceKey} is not a complete exact source event record.`);
    }
    const eventKey = `${event.clip}\u0000${event.time}\u0000${event.action}\u0000${sourceKey}\u0000${event.order}`;
    if (coreEventKeys.has(eventKey)) throw new Error(`Child-renderer event ${sourceKey} is recorded more than once.`);
    coreEventKeys.add(eventKey);
  }
  if ((profile.drawSequence ?? []).some((sourceKey) => excludedBySource.has(sourceKey))) {
    throw new Error('Rendering profile draw sequence contains a presentation-excluded renderer.');
  }
  for (const renderer of profile.renderers ?? []) {
    if (!renderer.hierarchyPath || !renderer.sourceReference) throw new Error(`Renderer ${renderer.name ?? '(unnamed)'} has no exact source hierarchy or object identity.`);
    const matches = (json.nodes ?? []).flatMap((node, index) => Number.isInteger(node.mesh) && paths[index] === renderer.hierarchyPath ? [index] : []);
    if (matches.length !== 1) throw new Error(`Renderer ${renderer.hierarchyPath} maps to ${matches.length} GLB nodes; expected exactly one.`);
    const nodeIndex = matches[0], node = json.nodes[nodeIndex], meshIndex = node.mesh, mesh = json.meshes[meshIndex];
    const sourceKey = exactSourceReferenceKey(renderer.sourceReference, `Renderer ${renderer.name ?? '(unnamed)'}`), prior = usedNodes.get(nodeIndex);
    if (excludedNodeClaims.has(nodeIndex)) throw new Error(`GLB node ${renderer.hierarchyPath} is claimed by both core and presentation-excluded source renderers.`);
    if (usedSourceRenderers.has(sourceKey)) throw new Error(`Source renderer ${sourceKey} is bound more than once in the rendering profile.`);
    usedSourceRenderers.set(sourceKey, renderer.hierarchyPath);
    if (prior && prior !== sourceKey) throw new Error(`GLB node ${renderer.hierarchyPath} is claimed by multiple source renderers.`);
    usedNodes.set(nodeIndex, sourceKey);
    renderer.glbNodeIndex = nodeIndex;
    const sourceSlots = (renderer.materialSlots ?? []).filter(slot => slot.sourceMaterialReference);
    const primitives = mesh?.primitives ?? [];
    const exportedNames = primitives.map(primitive => json.materials?.[primitive.material]?.name ?? null);
    const orderedMatch = sourceSlots.length === primitives.length && sourceSlots.every((slot, index) => exportedNames[index] === slot.sourceMaterialName);
    const sourceNameCounts = new Map();
    for (const slot of sourceSlots) sourceNameCounts.set(slot.sourceMaterialName, (sourceNameCounts.get(slot.sourceMaterialName) ?? 0) + 1);
    const slotsByName = new Map();
    for (const slot of sourceSlots) {
      const slots = slotsByName.get(slot.sourceMaterialName) ?? [];
      slots.push(slot);
      slotsByName.set(slot.sourceMaterialName, slots);
    }
    const duplicateSlotsByName = new Map([...slotsByName.entries()].filter(([, slots]) => slots.length > 1));
    for (const [sourceMaterialName, duplicateSlots] of duplicateSlotsByName.entries()) {
      const materialReferences = new Set(duplicateSlots.map(slot => sourceReferenceKey(slot.sourceMaterialReference)));
      const adapters = new Set(duplicateSlots.map(slot => slot.adapterId));
      if (materialReferences.size !== 1 || adapters.size !== 1) {
        throw new Error(`Renderer ${renderer.hierarchyPath} has repeated material name ${sourceMaterialName} with different source material identities.`);
      }
    }
    const duplicatePrimitiveAssignments = new Map();
    if (!orderedMatch) {
      for (const [sourceMaterialName, duplicateSlots] of duplicateSlotsByName.entries()) {
        const matchingPrimitives = exportedNames.flatMap((name, index) => {
          if (name === sourceMaterialName || name?.replace(/\.\d+$/, '') === sourceMaterialName) return [index];
          return [];
        });
        if (!matchingPrimitives.length) {
          throw new Error(`Renderer ${renderer.hierarchyPath} has repeated material name ${sourceMaterialName} but no matching GLB primitive for the exact source material identity.`);
        }
        if (matchingPrimitives.length < duplicateSlots.length) {
          // Some exporters collapse repeated assignments of the same Unity
          // material object into one GLB primitive. Sharing that primitive is
          // safe only because the source identities and adapters were proven
          // identical above; different source objects still fail closed.
          duplicateSlots.forEach(slot => duplicatePrimitiveAssignments.set(slot, matchingPrimitives));
        } else {
          let cursor = 0;
          duplicateSlots.forEach((slot, index) => {
            const remainingSlots = duplicateSlots.length - index;
            const remainingPrimitives = matchingPrimitives.length - cursor;
            const take = index === duplicateSlots.length - 1
              ? remainingPrimitives
              : Math.max(1, Math.floor(remainingPrimitives / remainingSlots));
            duplicatePrimitiveAssignments.set(slot, matchingPrimitives.slice(cursor, cursor + take));
            cursor += take;
          });
        }
      }
    }
    const claimedPrimitives = new Map();
    for (const [sourceIndex, slot] of sourceSlots.entries()) {
      let primitiveIndices;
      if (orderedMatch) primitiveIndices = [sourceIndex];
      else if (duplicatePrimitiveAssignments.has(slot)) primitiveIndices = duplicatePrimitiveAssignments.get(slot);
      else {
        if ((sourceNameCounts.get(slot.sourceMaterialName) ?? 0) > 1) throw new Error(`Renderer ${renderer.hierarchyPath} has repeated material slot names that cannot be aligned after GLB export.`);
        primitiveIndices = exportedNames.flatMap((name, index) => name === slot.sourceMaterialName ? [index] : []);
      }
      if (!primitiveIndices.length) throw new Error(`Renderer ${renderer.hierarchyPath} slot ${slot.slot} material ${slot.sourceMaterialName} has no exact GLB primitive.`);
      for (const index of primitiveIndices) {
        const previousMaterialReference = claimedPrimitives.get(index);
        if (previousMaterialReference && previousMaterialReference !== sourceReferenceKey(slot.sourceMaterialReference)) {
          throw new Error(`GLB primitive ${index} is claimed by multiple source material identities.`);
        }
        claimedPrimitives.set(index, sourceReferenceKey(slot.sourceMaterialReference));
      }
      const materialIndices = primitiveIndices.map(index => primitives[index].material);
      if (materialIndices.some(index => !Number.isInteger(index))) throw new Error(`Renderer ${renderer.hierarchyPath} slot ${slot.slot} has an unbound GLB material.`);
      slot.glb = { nodeIndex, nodeName: node.name ?? '', meshIndex, primitiveIndices, materialIndex: materialIndices[0], materialIndices };
    }
    if (claimedPrimitives.size !== primitives.length) throw new Error(`Renderer ${renderer.hierarchyPath} has GLB primitives without a source material-slot binding.`);
    node.extras = {
      ...node.extras,
      chibi: {
        ...node.extras?.chibi,
        sourceRenderer: {
          sourceReference: renderer.sourceReference,
          sourceMeshReference: renderer.sourceMesh?.sourceReference ?? null,
          ...(renderer.sourceMesh?.builtinResource ? { sourceMeshBuiltinResource: renderer.sourceMesh.builtinResource } : {}),
          defaultVisible: renderer.defaultVisible,
        },
      },
    };
  }
  for (const [nodeIndex, sourceKey] of excludedNodeClaims.entries()) {
    const exclusion = excludedBySource.get(sourceKey);
    if (!exclusion || usedNodes.has(nodeIndex)) throw new Error(`Presentation exclusion ${sourceKey} could not be applied without conflicting core geometry.`);
    const node = json.nodes[nodeIndex];
    const { sourceRenderer: _sourceRenderer, ...priorChibi } = node.extras?.chibi ?? {};
    node.extras = {
      ...node.extras,
      chibi: {
        ...priorChibi,
        presentationOnlyExcluded: {
          sourceReference: exclusion.sourceReference,
          reasonCode: exclusion.reasonCode,
          evidence: [...exclusion.evidence],
        },
      },
    };
    delete node.mesh;
    usedNodes.set(nodeIndex, `excluded:${sourceKey}`);
  }
  // Profile conversion is fail-closed: a successful exact profile may only
  // publish geometry claimed by a core source renderer or an exact,
  // source-evidenced presentation exclusion.  An unresolved mesh may still be
  // body/face/clothing/accessory/weapon content, so never hide it by default.
  const unprofiledGeometry = [];
  for (const [nodeIndex, node] of (json.nodes ?? []).entries()) {
    if (!Number.isInteger(node.mesh) || usedNodes.has(nodeIndex)) continue;
    unprofiledGeometry.push({ nodeIndex, nodeName: node.name ?? '', hierarchyPath: paths[nodeIndex] ?? '' });
  }
  unprofiledGeometry.sort((left, right) => left.nodeIndex - right.nodeIndex);
  const diagnostics = {
    schemaVersion: 1,
    policyVersion: profile.policyVersion ?? null,
    ...(equipment.present ? {
      equipmentBindingEvidence: equipment.evidence,
      coreRendererBlockers: equipment.blockers,
    } : {}),
    intentionallyExcludedRenderers: [...excludedNodeDiagnostics].sort((left, right) =>
      sourceReferenceKey(left.sourceReference).localeCompare(sourceReferenceKey(right.sourceReference))
        || Number(left.nodeIndex ?? Number.MAX_SAFE_INTEGER) - Number(right.nodeIndex ?? Number.MAX_SAFE_INTEGER)),
    excludedChildRendererEvents: [...excludedChildRendererEvents].sort((left, right) =>
      left.time - right.time || left.order - right.order
        || sourceReferenceKey(left.sourceRendererReference).localeCompare(sourceReferenceKey(right.sourceRendererReference))),
    fxExclusionProofs: policy.fxExclusionProofs,
    excludedFxInstantiationEvents: policy.excludedFxInstantiationEvents,
    unprofiledGeometry,
  };
  if (unprofiledGeometry.length) {
    embedRenderingProfileDiagnostics(diagnostics);
    throw new Error(`Unresolved unprofiled geometry may be required character/weapon content: ${unprofiledGeometry.map((item) => `${item.hierarchyPath || item.nodeName} (node ${item.nodeIndex})`).join(', ')}`);
  }
  embedRenderingProfileDiagnostics(diagnostics);
}

function colorArray(value) {
  if (!value) return null;
  const result = [value.r, value.g, value.b, value.a ?? 1].map(Number);
  return result.every(Number.isFinite) ? result : null;
}

const embeddedProfileTextures = new Map();

function sourceTextureInfo(slot, sourceTexture) {
  const materialKey = sourceReferenceKey(slot.sourceMaterialReference);
  const textureKey = sourceReferenceKey(sourceTexture.textureReference);
  if (!materialKey || !textureKey) throw new Error(`Source ${sourceTexture.name} for ${slot.sourceMaterialName} has no exact source identity.`);
  const overrides = (config.sourceTextureExports ?? config.sourceMainTextureExports ?? []).filter(override =>
    sourceReferenceKey(override.sourceMaterialReference) === materialKey
      && sourceReferenceKey(override.textureReference) === textureKey
      && (override.textureProperty ? override.textureProperty === sourceTexture.name : sourceTexture.name === '_MainTex'),
  );
  if (overrides.length !== 1 || typeof overrides[0].path !== 'string' || !fs.existsSync(overrides[0].path)) {
    throw new Error(`Source ${sourceTexture.name} was dropped for ${slot.sourceMaterialName}; no unique exact source texture export is available.`);
  }
  if (embeddedProfileTextures.has(textureKey)) return { index: embeddedProfileTextures.get(textureKey), texCoord: 0 };

  json.images ??= [];
  json.samplers ??= [];
  json.textures ??= [];
  const imageIndex = json.images.push({
    name: `${slot.sourceMaterialName ?? 'chibi'}_${sourceTexture.name}`,
    mimeType: 'image/png',
    bufferView: appendView(fs.readFileSync(overrides[0].path)),
  }) - 1;
  const samplerIndex = json.samplers.push({ magFilter: 9729, minFilter: 9729, wrapS: 10497, wrapT: 10497 }) - 1;
  const textureIndex = json.textures.push({ source: imageIndex, sampler: samplerIndex }) - 1;
  embeddedProfileTextures.set(textureKey, textureIndex);
  return { index: textureIndex, texCoord: 0 };
}

function applySourceTextureTransform(texture, sourceTexture, label) {
  if (!sourceTexture?.scale || !sourceTexture.offset) return;
  const scale = [Number(sourceTexture.scale.x), Number(sourceTexture.scale.y)];
  const offset = [Number(sourceTexture.offset.x), 1 - Number(sourceTexture.scale.y) - Number(sourceTexture.offset.y)];
  if (![...scale, ...offset].every(Number.isFinite)) throw new Error(`Texture transform is invalid for ${label}.`);
  json.extensionsUsed ??= [];
  if (!json.extensionsUsed.includes('KHR_texture_transform')) json.extensionsUsed.push('KHR_texture_transform');
  texture.extensions = { ...texture.extensions, KHR_texture_transform: { offset, scale } };
}

const profileCustomShaderAdapters = Object.freeze({
  "mx-c-transparent-st": {
    identity: "mx/c-transparent-st",
    programBlobSha256: "ff279d3985ac14ecb356f9ab863bb83b3b9d18033bfe897c877f8da866e6d345",
    sourceReference: { bundleSha256: "27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85", serializedFile: "CAB-38d7f184c16228480d78cd7ea10cae27", objectId: "-5281742850669710733" },
    fingerprint: "476551579a557a660da5fa3454da6f10193c729fef20430d4c905e8df0c7d7a5",
    forwardProgramHash: "a183c161a42534139176e57679b700599f385de97243d75ef719a70c0feea253",
    ditherProgramHash: "8b65ba41e0b6f12e63d7d04c8eb017ac03a7962880f76474faea12cdcde319f9",
    depthProgramHash: "4ea792966bb7d8359234279f7e000ebea5c5a4fedd7a62ed819225f5186bae98",
    forwardProgramRecordSha256: "e9758ef79668f2925973ee08ab66cc059609e4c2e8440fddd1c27547c9df66fe",
    ditherProgramRecordSha256: "f834a20f9f5d48e3b99e9c7fd896fed2162374e81d6d50112174d924401049cf",
    depthProgramRecordSha256: "33d45d0b45e7e4a2fd5f5fd4fe1d6b652e6d0d19de0d2a36665d344de31b7581",
    forwardParameterRecordSha256: "b6901e2d32877e7c7d19a77a513f345130a90e9e3c47ff7b22a39bab3af68f65",
    ditherParameterRecordSha256: "23375befaf4b4f6524e364569fe388024d9df20509258ad4b64b84491eee9a5c",
    depthParameterRecordSha256: "d80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532",
    forwardAttributes: ["POSITION", "NORMAL", "COLOR_0", "TEXCOORD_0"],
    depthAttributes: ["POSITION"],
    forwardUniforms: ["_WorldSpaceCameraPos", "_MxCharShadowTone", "_MxCharLightData", "_Tint", "_ShadowThreshold", "_ShadowTint", "_Cutoff", "_RimAreaMultiplier", "_RimStrength", "_AdditionalLightStrength", "_AdditionalLightSharpness", "_GrayBrightness", "_MainTex_ST", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_DitherThreshold", "_MaskRtoG", "_MaskGSensitivity", "_SeeThroughMinValue", "_SeeThroughTransparency", "_SeeThroughSmoothness", "_GlobalMipBias", "_MxCharLightDir", "_MxCharLightTone", "_MainTex", "_MaskTex", "hlslcc_mtx4x4unity_MatrixVP"],
    ditherUniforms: ["_WorldSpaceCameraPos", "_MxCharShadowTone", "_MxCharLightData", "_Tint", "_ShadowThreshold", "_ShadowTint", "_Cutoff", "_RimAreaMultiplier", "_RimStrength", "_AdditionalLightStrength", "_AdditionalLightSharpness", "_GrayBrightness", "_MainTex_ST", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_DitherThreshold", "_MaskRtoG", "_MaskGSensitivity", "_SeeThroughMinValue", "_SeeThroughTransparency", "_SeeThroughSmoothness", "_GlobalMipBias", "_MxCharLightDir", "_MxCharLightTone", "_MainTex", "_MaskTex", "hlslcc_mtx4x4unity_MatrixVP", "_ProjectionParams"],
    depthUniforms: ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld"],
    behavior: "mask/see-through/rim",
  },
  "projectmx-weapon-test1-damage": {
    identity: "projectmx/weapontest1damage",
    programBlobSha256: "962e3b88b0cc42a36e31e8eb2ba538d3cc571d37f4bec4aca1b30e14a6927e0b",
    sourceReference: { bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c", serializedFile: "CAB-428091522b4007f213bf16532c4528a1", objectId: "-2179428789015729742" },
    fingerprint: "dba2503cda8be6508b161525ab1202a9187f93c8924716efe6f3d061a4ff439b",
    shaderName: "ProjectMX/WeaponTest1Damage",
    shaderKeywordNames: ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "_ADDITIONAL_LIGHTS", "DEBUG_DISPLAY", "FOG_LINEAR", "FOG_EXP", "FOG_EXP2", "_DAMAGE_0", "_GLOW_0", "_DITHER_HORIZONTAL_LINES", "OUTLINE_RIM_LIGHT_POINT", "OUTLINE_RIM_LIGHT_SPOT", "_GRAYSCALE_MODE", "_CHAR_CUTOUT_MODE"],
    requiredProperties: ["_DamageON", "_Color", "_mainTex", "_sourceTex", "_NoiseTex", "_CrushScale", "_NoiseDir", "_DmgCol", "_NoiseColStrong", "_Damage", "_FireCol", "_FireBackCol_Str", "_FireValue", "_Fire", "_ShadowThreshold", "_ShadowStrong", "_LightValue", "_LightStrong", "_SpecStrong", "_ShadowTint", "_SpecColor", "_FakeLightDir", "_AdditionalLightStrength", "_AdditionalLightSharpness", "_UseGlow", "_GlowMaskColor0", "_GlowStrictness0", "_GlowTint0", "_GlowStrength0", "_OutlineTint", "_OutlineSolidColorTint", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_GrayBrightness", "_IsDither", "_DitherThreshold"],
    requiredTextureProperties: ["_mainTex", "_sourceTex"],
    passes: {
      forward: { pass: "forward", stateName: "ForwardLit", passIndex: 0, blobIndex: 32, parameterBlobIndex: 0, parameterRecordSha256: "1fd7d08c08cddbfd430fcce54986154a9a2a05611c22ed341936cd2d65c3f531", programHash: "8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0", programRecordSha256: "6493a59384085e9600cf22bbe3577b99a8f24801a9dd14823e1eadeec6f37bab", programDataLength: 9117, keywordIndices: [], keywordNames: [], usesNoiseTexture: false, renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false, sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0 } },
      glow: { pass: "glow", stateName: "ForwardLit", passIndex: 0, blobIndex: 34, parameterBlobIndex: 2, parameterRecordSha256: "eee4f7d62f87181a65c432811bc8f70278611bde7cdb34db471b2f71f39872a3", programHash: "7a52de32c3c7fcd54216ed9f9b542b93d56b2cecc687d524c5d46dff772bda61", programRecordSha256: "649300d147f68a8028da9cdf7518e59b06f18bb1bec00870e9d4c42cc28d4199", programDataLength: 9679, keywordIndices: [10], keywordNames: ["_GLOW_0"], usesNoiseTexture: false, renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false, sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0 } },
      outline: { pass: "outline", stateName: "Outline", passIndex: 1, blobIndex: 104, parameterBlobIndex: 80, parameterRecordSha256: "93e5c67bd74028d7dcc658e2ef1b6e8fdd5a335b14ba86a64a0f49751658c1e9", programHash: "a277ed38c25399804b406db92436fa1f6e174e14cd520e80ad93c5af0fa6b703", programRecordSha256: "476574cf56ad6f44e2f032e4f2168940da9aaa05d0bf508374e84433794ca026", programDataLength: 5141, keywordIndices: [], keywordNames: [], usesNoiseTexture: false, renderState: { zWrite: 1, zTest: 4, culling: 1, colorMask: 15, depthOnly: false, sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0 } },
      solidOutline: { pass: "solidOutline", stateName: "Solid Color Outline", passIndex: 2, blobIndex: 180, parameterBlobIndex: 176, parameterRecordSha256: "81b579f997a0f2ebcbafe8cfee65f85e80daec6676a2a8539acb2f28d5c1841e", programHash: "caddccda8439d960e4fc999a1e985816425f4bf71f6c5c7d5f39b23a3151b5a2", programRecordSha256: "cde8f0a6c8770da24e241fcba0b378f97a8b2fee1ac85636b4f812e33f4e095f", programDataLength: 5384, keywordIndices: [], keywordNames: [], usesNoiseTexture: false, renderState: { zWrite: 1, zTest: 4, culling: 1, colorMask: 15, depthOnly: false, sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0 } },
      shadow: { pass: "shadow", stateName: "ShadowCaster", passIndex: 3, blobIndex: 193, parameterBlobIndex: 192, parameterRecordSha256: "7776e03ce4d1ca4c97c6cfb57ed3ee6bf5800c7ad7c62f29f0b68e8d93f10b35", programHash: "c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0", programRecordSha256: "52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46", programDataLength: 4273, keywordIndices: [], keywordNames: [], usesNoiseTexture: false, renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false, sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0 } },
      depth: { pass: "depth", stateName: "DepthOnly", passIndex: 4, blobIndex: 195, parameterBlobIndex: 194, parameterRecordSha256: "d80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532", programHash: "5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513", programRecordSha256: "36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0", programDataLength: 2766, keywordIndices: [], keywordNames: [], usesNoiseTexture: false, renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 0, depthOnly: true, sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0 } },
    },
    behavior: "damage/noise/fire",
  },
  "mx-e-standard": {
    identity: "mx/e-standard",
    programBlobSha256: "b3edadb8e9c86afdab206cab761a0a574ee8e0baa75183cc24147a4e02ea1288",
    sourceReference: { bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c", serializedFile: "CAB-428091522b4007f213bf16532c4528a1", objectId: "-8678996592869746170" },
    fingerprint: "a9a00b4141e350c6dd7611bcaa1fbcbadfe35dff202f41bf3fe5df2ce5124019",
    shaderName: "MX/E-Standard",
    shaderKeywordNames: ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "_RECEIVE_SHADOWS_OFF", "DEBUG_DISPLAY", "_MAIN_LIGHT_SHADOWS", "_ADDITIONAL_LIGHTS", "LIGHTMAP_ON", "_BAKED_PREFAB", "FOG_LINEAR", "FOG_EXP", "FOG_EXP2", "INSTANCING_ON", "_ENV_CUTOUT_MODE", "_ENV_ALPHA_MODE", "_ENV_REFLECT_MODE", "_ENV_EMISSION_MODE", "_ENV_SPECULAR_MODE", "_DYNAMIC_LIGHTS", "_UNLIT_CODEADDCOLOR", "_DEBUG_LIGHTMAP", "_SPECULAR_SETUP"],
    requiredProperties: ["_Cutoff", "_PrefabLightmapTex", "_SrcBlend", "_DstBlend", "_SrcBlendAlpha", "_DstBlendAlpha", "_ZWrite", "_Cull", "_ZOffsetFactor", "_ZOffsetUnits", "_Color", "_MainTex", "_ReflectTex", "_ReflectBaseAmount", "_ReflectAnglePower", "_ShadowAttenRefl", "_ReflectStrength", "_EmissionTex", "_EmissionStrength", "_SpecTex", "_SpecLightDir", "_SpecLightColor", "_SpecPower", "_ShadowAttenSpec", "_LightmapStrength", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor"],
    sourceTextureProperties: ["_PrefabLightmapTex", "_MainTex", "_ReflectTex", "_EmissionTex", "_SpecTex"],
    requiredTextureProperties: ["_MainTex"],
    passes: {
      forwardStatic: { pass: "forwardStatic", stateName: "ForwardLit", passName: "", passIndex: 0, blobIndex: 160, parameterBlobIndex: 0, parameterRecordSha256: "f88facd27e428382fd81071a1bbd4f366583363e315d520319f0a8a4bb2e0389", programHash: "cfd7db48ce454d347374b95768908b6c27e267c7c3812643b2162cff8ccc078b", programRecordSha256: "6c8c8c189fa4171c300d1c23e270155b10999851bb1ab1dd6df96c5c1fb17c78", programDataLength: 7132, keywordIndices: [], keywordNames: [], attributes: ["POSITION", "NORMAL", "TEXCOORD_0"], uniforms: ["_ProjectionParams", "hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "unity_SHAr", "unity_SHAg", "unity_SHAb", "unity_SHBr", "unity_SHBg", "unity_SHBb", "unity_SHC", "_MainTex_ST", "_Color", "_Cutoff", "_PrefabLightmapTex_ST", "_ReflectTex_ST", "_ReflectBaseAmount", "_ReflectAnglePower", "_ShadowAttenRefl", "_ReflectStrength", "_EmissionStrength", "_SpecLightDir", "_SpecLightColor", "_SpecPower", "_ShadowAttenSpec", "_LightmapStrength", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_GlobalMipBias", "_MainTex"] },
      forwardDynamic: { pass: "forwardDynamic", stateName: "ForwardLit", passName: "", passIndex: 0, blobIndex: 171, parameterBlobIndex: 4, parameterRecordSha256: "86bcf1ab50b14c400c719927e0ead152e358475297170daebeceadc06d46bfb6", programHash: "ba83d0d99dbb57507bc8fb0f423304c93b59a6c1703aa4f775f0fd6020fd3cf8", programRecordSha256: "034d968d7b7778638f25e050f5ab099098afb32688543b8d41e77dd112063d6f", programDataLength: 8112, keywordIndices: [19], keywordNames: ["_DYNAMIC_LIGHTS"], attributes: ["POSITION", "NORMAL", "TEXCOORD_0"], uniforms: ["_MainLightPosition", "_WorldSpaceCameraPos", "_ProjectionParams", "hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "unity_SHAr", "unity_SHAg", "unity_SHAb", "unity_SHBr", "unity_SHBg", "unity_SHBb", "unity_SHC", "_MainTex_ST", "_Color", "_Cutoff", "_PrefabLightmapTex_ST", "_ReflectTex_ST", "_ReflectBaseAmount", "_ReflectAnglePower", "_ShadowAttenRefl", "_ReflectStrength", "_EmissionStrength", "_SpecLightDir", "_SpecLightColor", "_SpecPower", "_ShadowAttenSpec", "_LightmapStrength", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_GlobalMipBias", "_MainTex", "_MainLightColor"] },
      shadow: { pass: "shadow", stateName: "ShadowCaster", passName: "", passIndex: 1, blobIndex: 1316, parameterBlobIndex: 1312, parameterRecordSha256: "697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17", programHash: "c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0", programRecordSha256: "52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46", programDataLength: 4273, keywordIndices: [], keywordNames: [], attributes: ["POSITION", "NORMAL"], uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject"] },
      depth: { pass: "depth", stateName: "DepthOnly", passName: "", passIndex: 2, blobIndex: 1324, parameterBlobIndex: 1320, parameterRecordSha256: "18defb46cf7eb1e1646d318f215cc2eaa29fa06411690ba443cade9de3be4181", programHash: "5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513", programRecordSha256: "36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0", programDataLength: 2766, keywordIndices: [], keywordNames: [], attributes: ["POSITION"], uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject"] },
      meta: { pass: "meta", stateName: "Meta", passName: "", passIndex: 3, blobIndex: 1331, parameterBlobIndex: 1328, parameterRecordSha256: "f3597fa2708ab4924492304ff8dcfd3a7271f291c931e74d1b1a480634ac4220", programHash: "f1ac8ee9712bdf61db2946f3759d2bc6bf3e3f046ee76f9f2891521f84cb4201", programRecordSha256: "551fed3636dc25ca1923b2d081b1c2a63ce5cb129433e640a21892c6a625641f", programDataLength: 6928, keywordIndices: [], keywordNames: [], attributes: ["POSITION", "TEXCOORD_0", "TEXCOORD_1", "TEXCOORD_2"], uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "_MainTex_ST", "_Color", "_Cutoff", "_PrefabLightmapTex_ST", "_ReflectTex_ST", "_ReflectBaseAmount", "_ReflectAnglePower", "_ShadowAttenRefl", "_ReflectStrength", "_EmissionStrength", "_SpecLightDir", "_SpecLightColor", "_SpecPower", "_ShadowAttenSpec", "_LightmapStrength", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "unity_OneOverOutputBoost", "unity_MaxOutputValue", "unity_MetaVertexControl", "unity_MetaFragmentControl", "unity_VisualizationMode", "_GlobalMipBias", "_MainTex"] },
    },
    behavior: "reflect/emission/spec",
  },
  "dsfx-glitch-tex": {
    identity: "dsfx/fx_shader_glitch_tex",
    programBlobSha256: "b8f29baf75b913a1231adf3c24f8a24b179deaee5bbc03a0e145984c691a15a0",
    sourceReference: { bundleSha256: "27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85", serializedFile: "CAB-38d7f184c16228480d78cd7ea10cae27", objectId: "-50954330373109545" },
    fingerprint: "da4f6c1689e70742a01d91febca067eb0492a4121ad2fc63476323a6459f7b3e",
    shaderName: "DSFX/FX_SHADER_Glitch_Tex",
    shaderKeywordNames: ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "DEBUG_DISPLAY", "INSTANCING_ON", "_CASTING_PUNCTUAL_LIGHT_SHADOW"],
    requiredProperties: ["_MainTex", "_x", "_y", "_Speed_Value", "_NoiseTex", "_Shaking", "_Glitch_value", "_Jitter", "_Cull_Mode"],
    requiredTextureProperties: ["_MainTex", "_NoiseTex"],
    passes: {
      forward: { pass: "forward", stateName: "Forward", passIndex: 0, blobIndex: 1, parameterBlobIndex: 0, parameterRecordSha256: "42c347357ddcd6b9365ba7a523bf05e2b4aa17076093ba172e7ac7ad313f1450", programHash: "38d23aef9f77ca1a78dfd0efb262bca0bccdafaa1b72b2da397d03bb8c8baf71", programRecordSha256: "3bc739b0ac1bdfebdef0f55320721c38555e9e0e263a844a90287b32c3656dbc", programDataLength: 5868, keywordIndices: [], keywordNames: [], requiredAttributes: ["POSITION", "TEXCOORD_0"], requiredUniforms: ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "_Time", "_Cull_Mode", "_Speed_Value", "_Shaking", "_Jitter", "_Glitch_value", "_x", "_y", "_NoiseTex", "_MainTex"], renderState: { zWrite: 0, zTest: 4, culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false } },
      shadow: { pass: "shadow", stateName: "ShadowCaster", passIndex: 1, blobIndex: 3, parameterBlobIndex: 2, parameterRecordSha256: "89cb58753bbfac486d044fc253235f533f9634393bd30204de277063619427ee", programHash: "c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5", programRecordSha256: "9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4", programDataLength: 4379, keywordIndices: [], keywordNames: [], requiredAttributes: ["POSITION", "NORMAL"], requiredUniforms: ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorld"], renderState: { zWrite: 1, zTest: 4, culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true } },
    },
    behavior: "time-driven noise glitch",
  },
  "dsfx-matcap": {
    identity: "dsfx/fx_shader_matcap",
    programBlobSha256: "3da48932a17f98d5de6fc428f1ba992e824152b12be7e30a169cae5de3c1ba9d",
    sourceReference: { bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c", serializedFile: "CAB-428091522b4007f213bf16532c4528a1", objectId: "-2917564576425350283" },
    fingerprint: "99e3d6e9cccc359cdf91cd2e7253b62b1929a522326d1291a7ae43d944e468dc",
    shaderName: "DSFX/FX_SHADER_Matcap",
    shaderKeywordNames: ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "DEBUG_DISPLAY", "INSTANCING_ON", "_CASTING_PUNCTUAL_LIGHT_SHADOW"],
    requiredProperties: ["_Main_Color", "_Main_Tex", "_Matcap_Tex", "_ZWrite_Mode", "_Cull_Mode", "_texcoord"],
    requiredTextureProperties: ["_Main_Tex", "_Matcap_Tex"],
    passes: {
      forward: { pass: "forward", variant: "static", stateName: "Forward", passIndex: 0, blobIndex: 2, parameterBlobIndex: 0, parameterRecordSha256: "1230f6ffd03db1548c00445789724828bc1a7f9337d3d045b19258d6e99f2150", programHash: "b98d2bba4e992fe400691c433717001cad063da52877a5d4c9344af5f044581e", programRecordSha256: "a6bfa89e41fbd5fd2c430cc5116ffcbe0b0a279fe3413c53a8288ee647be394e", programDataLength: 5178, keywordIndices: [], keywordNames: [], requiredAttributes: ["POSITION", "NORMAL", "TEXCOORD_0", "COLOR_0"], requiredUniforms: ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "hlslcc_mtx4x4unity_MatrixV", "_Main_Color", "_Main_Tex_ST", "_ZWrite_Mode", "_Cull_Mode", "_Matcap_Tex", "_Main_Tex"], renderState: { zWrite: 0, zWriteProperty: "_ZWrite_Mode", zTest: 4, zTestProperty: "<noninit>", culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false } },
      forwardInstanced: { pass: "forward", variant: "instanced", stateName: "Forward", passIndex: 0, blobIndex: 3, parameterBlobIndex: 1, parameterRecordSha256: "1f57f72e922d53d408292fef50d8c2a03f8709aa7bbb4d2a476d2bcb40768175", programHash: "38ad3365c7eab792e89d17ef3dd20f0ad6e9247acfec18d09ce4338f8b4b25e4", programRecordSha256: "fea97058aa6a206718c737ac7cc12386dca183d0a6536b345a12c75c3eaac49f", programDataLength: 4726, keywordIndices: [5], keywordNames: ["INSTANCING_ON"], requiredAttributes: ["POSITION", "NORMAL", "TEXCOORD_0", "COLOR_0"], requiredUniforms: ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "hlslcc_mtx4x4unity_ObjectToWorldArray", "hlslcc_mtx4x4unity_WorldToObjectArray", "unity_Builtins0Array", "hlslcc_mtx4x4unity_MatrixV", "_Main_Color", "_Main_Tex_ST", "_ZWrite_Mode", "_Cull_Mode", "_Matcap_Tex", "_Main_Tex"], renderState: { zWrite: 0, zWriteProperty: "_ZWrite_Mode", zTest: 4, zTestProperty: "<noninit>", culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false } },
      shadow: { pass: "shadow", variant: "static", stateName: "ShadowCaster", passIndex: 1, blobIndex: 6, parameterBlobIndex: 4, parameterRecordSha256: "697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17", programHash: "d33e4c0eafc7babbf55f46b18680bc921c80e888df1fe3d81e6620c9533a0b67", programRecordSha256: "34b37cd383e739b9b50ef5cdc0568c314480d50bd340ee778743357cc4bbfcb3", programDataLength: 4923, keywordIndices: [], keywordNames: [], requiredAttributes: ["POSITION", "NORMAL", "COLOR_0"], requiredUniforms: ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject"], renderState: { zWrite: 1, zWriteProperty: "<noninit>", zTest: 4, zTestProperty: "<noninit>", culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true } },
      shadowInstanced: { pass: "shadow", variant: "instanced", stateName: "ShadowCaster", passIndex: 1, blobIndex: 7, parameterBlobIndex: 5, parameterRecordSha256: "48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51", programHash: "8adb20b2353020979dd6a7e367c803ae05111cabd4c0660265bc1810212230f7", programRecordSha256: "d0ae10bc6b4deea8f8837c6f6ea86b53d82009a94bb1aa28bfb63667d09c5cb3", programDataLength: 4599, keywordIndices: [5], keywordNames: ["INSTANCING_ON"], requiredAttributes: ["POSITION", "NORMAL", "COLOR_0"], requiredUniforms: ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorldArray", "hlslcc_mtx4x4unity_WorldToObjectArray", "unity_Builtins0Array"], renderState: { zWrite: 1, zWriteProperty: "<noninit>", zTest: 4, zTestProperty: "<noninit>", culling: 0, cullingProperty: "_Cull_Mode", sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true } },
    },
    behavior: "matcap/view-space-normal",
  },
  "mx-e-water-v2": {
    identity: "mx/e-water-v2",
    programBlobSha256: "97f1c0143e2fc4451b6892f2d0de121fd9abdd5c80728ba22c2e2427d0470748",
    sourceReference: { bundleSha256: "27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85", serializedFile: "CAB-38d7f184c16228480d78cd7ea10cae27", objectId: "-1189838917732900529" },
    behavior: "ripple/distortion",
  },
  "mx-unlit-outline": {
    identity: "mx/unlitoutline",
    programBlobSha256: "91f6c05f3ea2768b13f3879bff7eb56fd28bd852aca89131caa3ddfec5ecf8ce",
    sourceReference: { bundleSha256: "27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85", serializedFile: "CAB-38d7f184c16228480d78cd7ea10cae27", objectId: "-8748270323205728420" },
    baseProgramHash: "8dd437bded36c20c116d416a2a3f679deb58b3249d887cfce6fbcfeaad94a24e",
    outlineProgramHash: "cf33765ab69ff40c91202ccb8b006211246685b6be23a41636cdf9de69bffde0",
    baseAttributes: ["POSITION", "TEXCOORD_0"],
    outlineAttributes: ["POSITION", "TANGENT", "COLOR_0", "TEXCOORD_0"],
    baseUniforms: ["_MainTex_ST", "_Tint", "_MainTex"],
    outlineUniforms: ["_MainTex_ST", "_OutlineTint", "_OutlineZCorrection", "_MainTex", "_MainLightColor", "_ScreenParams", "hlslcc_mtx4x4glstate_matrix_projection", "hlslcc_mtx4x4unity_MatrixInvV", "hlslcc_mtx4x4unity_MatrixVP"],
    behavior: "the second outline pass",
  },
});

const projectMxPassDeclarations = Object.freeze({
  forward: {
    attributes: ["POSITION", "NORMAL", "TEXCOORD_0"],
    uniforms: ["_WorldSpaceCameraPos", "hlslcc_mtx4x4unity_MatrixVP", "_MxCharShadowTone", "_ShadowTint", "_mainTex_ST", "_FakeLightDir", "_MxCharLightTone", "_MxCharLightData", "_ShadowThreshold", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_Color", "_ShadowStrong", "_SpecColor", "_LightValue", "_LightStrong", "_SpecStrong", "_FireCol", "_FireBackCol_Str", "_FireValue", "_Fire", "_mainTex", "_sourceTex"],
  },
  glow: {
    attributes: ["POSITION", "NORMAL", "TEXCOORD_0"],
    uniforms: ["_WorldSpaceCameraPos", "hlslcc_mtx4x4unity_MatrixVP", "_MxCharShadowTone", "_ShadowTint", "_mainTex_ST", "_FakeLightDir", "_MxCharLightTone", "_MxCharLightData", "_ShadowThreshold", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor", "_Color", "_ShadowStrong", "_SpecColor", "_LightValue", "_LightStrong", "_SpecStrong", "_FireCol", "_FireBackCol_Str", "_FireValue", "_Fire", "_mainTex", "_sourceTex", "_GlowMaskColor0", "_GlowStrictness0", "_GlowTint0", "_GlowStrength0"],
  },
  outline: {
    attributes: ["POSITION", "COLOR_0", "TANGENT", "TEXCOORD_0"],
    uniforms: ["_MainLightColor", "_ScreenParams", "hlslcc_mtx4x4glstate_matrix_projection", "hlslcc_mtx4x4unity_MatrixInvV", "hlslcc_mtx4x4unity_MatrixVP", "_OutlineTint", "_OutlineZCorrection", "_mainTex"],
  },
  solidOutline: {
    attributes: ["POSITION", "COLOR_0", "TANGENT"],
    uniforms: ["_MainLightColor", "_ScreenParams", "hlslcc_mtx4x4glstate_matrix_projection", "hlslcc_mtx4x4unity_MatrixInvV", "hlslcc_mtx4x4unity_MatrixVP", "_AdditionalLightSharpness", "_AdditionalLightStrength", "_OutlineTint", "_OutlineZCorrection", "_OutlineSolidColorTint", "_DitherThreshold"],
  },
  shadow: {
    attributes: ["POSITION", "NORMAL"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier"],
  },
  depth: {
    attributes: ["POSITION"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP"],
  },
});

// These are the only ProjectMX source meshes whose Unity Mesh typetrees prove
// that the Color channel is absent (dimension 0, m_Colors null).  Keep this
// evidence exact and source-specific: a missing exported COLOR_0 on any other
// mesh remains a hard validation failure.  Matching is by full source mesh
// identity; a character id, material name, or shader name is not sufficient.
const PROJECTMX_COLORLESS_SOURCE_MESH_REFERENCE = Object.freeze({
  bundleSha256: "66025c332131b4488a04cb314b4598168f213b7df0ba6e58c8695543c7b083b8",
  serializedFile: "CAB-ada26f5ac0ed21c4234486b090f5cf91",
  objectId: "7429403255582981804",
});
const PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE = Object.freeze({
  sourceReference: PROJECTMX_COLORLESS_SOURCE_MESH_REFERENCE,
  vertexCount: 10256,
  subMeshVertexCounts: Object.freeze([9392, 864]),
  colorChannelDimension: 0,
  colorsPresent: false,
});
const PROJECTMX_COLOR_DEFAULT = Object.freeze([0, 0, 0, 1]);
const PROJECTMX_COLOR_NORMALIZATION = Object.freeze({
  sourceMeshReference: PROJECTMX_COLORLESS_SOURCE_MESH_REFERENCE,
  sourceVertexCount: PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE.vertexCount,
  sourceSubMeshVertexCounts: PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE.subMeshVertexCounts,
  sourceColorChannelDimension: PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE.colorChannelDimension,
  sourceColorsPresent: PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE.colorsPresent,
  defaultValue: PROJECTMX_COLOR_DEFAULT,
});
const PROJECTMX_SENA_COLORLESS_SOURCE_MESH_REFERENCE = Object.freeze({
  bundleSha256: "12145f231b3c8b093c728296b771f4ae89a1fdd9e98f3afc915668fcd77591c5",
  serializedFile: "CAB-74b254d25a0b77afb604cb26c86ff7a2",
  objectId: "-4368492268259368080",
});
const PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE = Object.freeze({
  sourceReference: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_REFERENCE,
  vertexCount: 9203,
  subMeshVertexCounts: Object.freeze([9203]),
  indexCount: 22653,
  colorChannelDimension: 0,
  colorsPresent: false,
});
const PROJECTMX_SENA_COLOR_NORMALIZATION = Object.freeze({
  sourceMeshReference: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_REFERENCE,
  sourceVertexCount: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE.vertexCount,
  sourceSubMeshVertexCounts: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE.subMeshVertexCounts,
  sourceIndexCount: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE.indexCount,
  sourceColorChannelDimension: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE.colorChannelDimension,
  sourceColorsPresent: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE.colorsPresent,
  defaultValue: PROJECTMX_COLOR_DEFAULT,
});
const PROJECTMX_COLORLESS_SOURCE_MESH_RECORDS = Object.freeze([
  Object.freeze({
    sourceReference: PROJECTMX_COLORLESS_SOURCE_MESH_REFERENCE,
    evidence: PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE,
    normalization: PROJECTMX_COLOR_NORMALIZATION,
  }),
  Object.freeze({
    sourceReference: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_REFERENCE,
    evidence: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE,
    normalization: PROJECTMX_SENA_COLOR_NORMALIZATION,
  }),
]);
const projectMxPassesRequireColor = Object.values(projectMxPassDeclarations)
  .some((pass) => pass.attributes.includes("COLOR_0"));

function projectMxSourceMeshReferenceKey(reference) {
  return reference
    ? `${String(reference.bundleSha256).toLowerCase()}:${String(reference.serializedFile).toLowerCase()}:${String(reference.objectId)}`
    : "";
}

function projectMxExactSourceReference(actual, expected) {
  return !!actual && typeof actual === "object" && Object.keys(actual).length === 3
    && projectMxSourceMeshReferenceKey(actual) === projectMxSourceMeshReferenceKey(expected);
}

function projectMxColorlessSourceMeshRecordForReference(reference) {
  return PROJECTMX_COLORLESS_SOURCE_MESH_RECORDS.find((record) => projectMxExactSourceReference(reference, record.sourceReference)) ?? null;
}

function projectMxExactColorlessSourceEvidence(value, expected) {
  return !!value && typeof value === "object" && Object.keys(value).length === Object.keys(expected).length
    && projectMxExactSourceReference(value.sourceReference, expected.sourceReference)
    && value.vertexCount === expected.vertexCount
    && Array.isArray(value.subMeshVertexCounts)
    && value.subMeshVertexCounts.length === expected.subMeshVertexCounts.length
    && value.subMeshVertexCounts.every((count, index) => count === expected.subMeshVertexCounts[index])
    && (expected.indexCount === undefined || value.indexCount === expected.indexCount)
    && value.colorChannelDimension === expected.colorChannelDimension
    && value.colorsPresent === expected.colorsPresent;
}

function projectMxExactColorNormalization(value, expected) {
  return !!value && typeof value === "object" && Object.keys(value).length === Object.keys(expected).length
    && projectMxExactSourceReference(value.sourceMeshReference, expected.sourceMeshReference)
    && value.sourceVertexCount === expected.sourceVertexCount
    && Array.isArray(value.sourceSubMeshVertexCounts)
    && value.sourceSubMeshVertexCounts.length === expected.sourceSubMeshVertexCounts.length
    && value.sourceSubMeshVertexCounts.every((count, index) => count === expected.sourceSubMeshVertexCounts[index])
    && (expected.sourceIndexCount === undefined || value.sourceIndexCount === expected.sourceIndexCount)
    && value.sourceColorChannelDimension === expected.sourceColorChannelDimension
    && value.sourceColorsPresent === expected.sourceColorsPresent
    && Array.isArray(value.defaultValue)
    && value.defaultValue.length === PROJECTMX_COLOR_DEFAULT.length
    && value.defaultValue.every((component, index) => component === PROJECTMX_COLOR_DEFAULT[index]);
}

function projectMxColorlessEvidenceForRenderer(renderer, label) {
  const sourceMesh = renderer?.sourceMesh;
  const colorlessSourceRecord = projectMxColorlessSourceMeshRecordForReference(sourceMesh?.sourceReference);
  const evidence = sourceMesh?.projectMxSourceMeshEvidence;
  if (evidence !== undefined && (!colorlessSourceRecord || !projectMxExactColorlessSourceEvidence(evidence, colorlessSourceRecord.evidence))) {
    throw new Error(`${label} has unverified source-missing COLOR_0 evidence.`);
  }
  if (colorlessSourceRecord && (!evidence || !projectMxExactColorlessSourceEvidence(evidence, colorlessSourceRecord.evidence))) {
    throw new Error(`${label} has no exact source-missing COLOR_0 evidence.`);
  }
  return colorlessSourceRecord ? evidence : null;
}

function projectMxTopologyEvidenceForRenderer(evidence) {
  return evidence && Number.isInteger(evidence.indexCount) ? evidence : null;
}

function projectMxTopologyBinding(slot, label, evidence) {
  const binding = slot.glb;
  if (!binding || !Number.isInteger(binding.meshIndex)
    || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
    || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) {
    throw new Error(`${label} has no exact GLB primitive/material binding.`);
  }
  const mesh = json.meshes?.[binding.meshIndex];
  if (!mesh || !Array.isArray(mesh.primitives)) throw new Error(`${label} has no exact GLB mesh binding.`);
  if (binding.primitiveIndices.length !== evidence.subMeshVertexCounts.length) {
    throw new Error(`${label} has a GLB primitive count that does not match exact source submesh evidence.`);
  }
  return binding.primitiveIndices.map((primitiveIndex, index) => {
    const primitive = mesh.primitives?.[primitiveIndex];
    const materialIndex = binding.materialIndices[index];
    if (!Number.isInteger(primitiveIndex) || primitiveIndex < 0 || !primitive
      || !Number.isInteger(materialIndex) || primitive.material !== materialIndex) {
      throw new Error(`${label} lost its exact GLB primitive/material binding.`);
    }
    const positionIndex = primitive.attributes?.POSITION;
    const position = json.accessors?.[positionIndex];
    if (!Number.isInteger(positionIndex) || !position || position.componentType !== 5126 || position.type !== 'VEC3'
      || !Number.isInteger(position.count) || position.count < 0) {
      throw new Error(`${label} primitive ${primitiveIndex} has no exact POSITION source data.`);
    }
    if (primitive.mode !== undefined && primitive.mode !== 4) {
      throw new Error(`${label} primitive ${primitiveIndex} is not indexed TRIANGLES.`);
    }
    const indexAccessor = json.accessors?.[primitive.indices];
    if (!Number.isInteger(primitive.indices) || !indexAccessor || indexAccessor.type !== 'SCALAR'
      || ![5121, 5123, 5125].includes(indexAccessor.componentType) || indexAccessor.normalized
      || !Number.isInteger(indexAccessor.count) || indexAccessor.count !== evidence.indexCount || indexAccessor.count % 3 !== 0) {
      throw new Error(`${label} primitive ${primitiveIndex} does not preserve the exact indexed TRIANGLES topology.`);
    }
    for (const [semantic, accessorIndex] of Object.entries(primitive.attributes ?? {})) {
      if (semantic === 'COLOR_0') continue;
      const accessor = json.accessors?.[accessorIndex];
      if (!Number.isInteger(accessorIndex) || !accessor || accessor.count !== position.count) {
        throw new Error(`${label} primitive ${primitiveIndex} has mismatched non-color attribute counts.`);
      }
    }
    return { primitive, primitiveIndex, position, indexAccessor, materialIndex };
  });
}

function materializeProjectMxColorAttributes(renderer, slot) {
  if (slot.adapterId !== "projectmx-weapon-test1-damage") return null;
  const label = `ProjectMX/WeaponTest1Damage ${slot.sourceMaterialName ?? "(unnamed)"}`;
  const evidence = projectMxColorlessEvidenceForRenderer(renderer, label);
  const binding = slot.glb;
  if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices)) return null;
  const topologyEvidence = projectMxTopologyEvidenceForRenderer(evidence);
  if (topologyEvidence) projectMxTopologyBinding(slot, label, topologyEvidence);
  const mesh = json.meshes?.[binding.meshIndex];
  if (!mesh) throw new Error(`${label} has no exact GLB mesh binding.`);
  for (const primitiveIndex of binding.primitiveIndices) {
    const primitive = mesh.primitives?.[primitiveIndex];
    if (!primitive) throw new Error(`${label} primitive ${primitiveIndex} is missing.`);
    const positionIndex = primitive.attributes?.POSITION;
    const position = json.accessors?.[positionIndex];
    if (!Number.isInteger(positionIndex) || !position || position.componentType !== 5126 || position.type !== "VEC3"
      || !Number.isInteger(position.count) || position.count < 0) {
      throw new Error(`${label} primitive ${primitiveIndex} has no exact POSITION source data.`);
    }
    if (!evidence) {
      const colorIndex = primitive.attributes?.COLOR_0;
      const color = json.accessors?.[colorIndex];
      if (!Number.isInteger(colorIndex) || !color || color.componentType !== 5126 || color.type !== "VEC4"
        || color.count !== position.count) {
        throw new Error(`${label} primitive ${primitiveIndex} does not preserve COLOR_0 source data.`);
      }
      continue;
    }
    if (!Number.isInteger(primitiveIndex) || primitiveIndex < 0
      || primitiveIndex >= evidence.subMeshVertexCounts.length) {
      throw new Error(`${label} primitive ${primitiveIndex} has no exact source submesh color evidence.`);
    }
    const expectedCount = topologyEvidence ? position.count : evidence.subMeshVertexCounts[primitiveIndex];
    if (position.count !== expectedCount) {
      throw new Error(`${label} primitive ${primitiveIndex} POSITION vertex count does not match exact source submesh evidence.`);
    }
    primitive.attributes ??= {};
    const colorIndex = primitive.attributes.COLOR_0;
    if (colorIndex === undefined) {
      json.accessors ??= [];
      json.bufferViews ??= [];
      primitive.attributes.COLOR_0 = appendAccessor(
        Array.from({ length: position.count }, () => [...PROJECTMX_COLOR_DEFAULT]), "VEC4", 4,
      );
      continue;
    }
    const color = json.accessors?.[colorIndex];
    if (!Number.isInteger(colorIndex) || !color || color.componentType !== 5126 || color.type !== "VEC4"
      || color.count !== position.count) {
      throw new Error(`${label} primitive ${primitiveIndex} COLOR_0 vertex count does not match exact source submesh evidence.`);
    }
  }
  const colorlessSourceRecord = projectMxColorlessSourceMeshRecordForReference(renderer?.sourceMesh?.sourceReference);
  return evidence ? colorlessSourceRecord.normalization : null;
}

function validateProjectMxColorNormalization(profile) {
  if (!projectMxPassesRequireColor) return;
  for (const renderer of profile?.renderers ?? []) for (const slot of renderer.materialSlots ?? []) {
    if (slot.adapterId !== "projectmx-weapon-test1-damage") continue;
    const label = `ProjectMX/WeaponTest1Damage ${slot.sourceMaterialName ?? "(unnamed)"}`;
    const evidence = projectMxColorlessEvidenceForRenderer(renderer, label);
    const colorlessSourceRecord = projectMxColorlessSourceMeshRecordForReference(renderer?.sourceMesh?.sourceReference);
    const binding = slot.glb;
    const topologyEvidence = projectMxTopologyEvidenceForRenderer(evidence);
    if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices)) {
      if (topologyEvidence) throw new Error(`${label} has no exact GLB primitive/material binding.`);
      continue;
    }
    const topologyEntries = topologyEvidence ? projectMxTopologyBinding(slot, label, topologyEvidence) : null;
    for (const [bindingIndex, primitiveIndex] of binding.primitiveIndices.entries()) {
      const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex];
      if (!primitive) throw new Error(`${label} primitive ${primitiveIndex} is missing.`);
      if (Array.isArray(binding.materialIndices) && primitive.material !== binding.materialIndices[bindingIndex]) {
        throw new Error(`${label} lost its exact GLB primitive/material binding.`);
      }
      const material = json.materials?.[primitive.material];
      const normalization = material?.extras?.chibi?.projectMxColorNormalization;
      if (!evidence) {
        if (normalization !== undefined) throw new Error(`${label} has unverified COLOR_0 normalization provenance.`);
        continue;
      }
      if (!projectMxExactColorNormalization(normalization, colorlessSourceRecord.normalization)) {
        throw new Error(`${label} lost its exact COLOR_0 normalization provenance.`);
      }
      if (!Number.isInteger(primitiveIndex) || primitiveIndex < 0
        || primitiveIndex >= evidence.subMeshVertexCounts.length) {
        throw new Error(`${label} primitive ${primitiveIndex} has no exact source submesh color evidence.`);
      }
      const position = json.accessors?.[primitive.attributes?.POSITION];
      const expectedCount = topologyEvidence ? topologyEntries[bindingIndex].position.count : evidence.subMeshVertexCounts[primitiveIndex];
      const colorIndex = primitive.attributes?.COLOR_0;
      const color = json.accessors?.[colorIndex];
      if (!position || position.count !== expectedCount || !Number.isInteger(colorIndex) || !color
        || color.componentType !== 5126 || color.type !== "VEC4" || color.count !== expectedCount) {
        throw new Error(`${label} primitive ${primitiveIndex} COLOR_0 vertex count does not match exact source submesh evidence.`);
      }
      if (readAccessor(colorIndex).some((value) => value.length !== colorlessSourceRecord.normalization.defaultValue.length
        || value.some((component, index) => component !== colorlessSourceRecord.normalization.defaultValue[index]))) {
        throw new Error(`${label} primitive ${primitiveIndex} does not preserve the exact Unity default COLOR_0 value.`);
      }
      if (topologyEvidence) {
        const indices = readAccessor(primitive.indices).flat();
        if (indices.some((value) => !Number.isInteger(value) || value < 0 || value >= position.count)) {
          throw new Error(`${label} primitive ${primitiveIndex} has an out-of-range or non-integer index.`);
        }
      }
    }
  }
}

// These are the only DSFX programs whose source evidence proves a static
// texture/tint path.  Identity, object reference, and program hash are all
// required; a material name alone is never sufficient.  The declaration set
// is duplicated here because postprocess must fail closed even for a profile
// JSON that has been altered after TypeScript profile construction.
const profileDsfxStaticAdapters = Object.freeze({
  "dsfx/fx_shader_additive_0": {
    programBlobSha256: "90b5288cb90cc49fbe68b9b8dac5f821c125c6954b9a4e64e4d66564f7668808",
    sourceReference: { bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c", serializedFile: "CAB-428091522b4007f213bf16532c4528a1", objectId: "-4115771715742154417" },
    fingerprint: "e4f30af59274e0b917915212c19c6c7e8c47f2da605d04a0eb6649c5d0ff1cfc",
    shaderKeywordNames: ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "DEBUG_DISPLAY", "INSTANCING_ON", "_CASTING_PUNCTUAL_LIGHT_SHADOW"],
    propertyNames: ["_Color", "_Texture", "_Custom_Data_Offset_Use", "_ZWrite_Mode", "_Cull_Mode", "_ZOffsetFactor", "_ZOffsetUnits", "_ZTest_Mode"],
    sourceBlend: 1, destinationBlend: 1,
  },
  "dsfx/fx_shader_alphablend_add": {
    programBlobSha256: "44e96adec490724b76b094666ab9533d0814f804b2698b336672025b5f9607af",
    sourceReference: { bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c", serializedFile: "CAB-428091522b4007f213bf16532c4528a1", objectId: "3898777625326355543" },
    fingerprint: "bdf731975748307a798ac9b06c9d2bbb0078ac1a80d02c5d790de6e85c8aceb8",
    shaderKeywordNames: ["STEREO_INSTANCING_ON", "UNITY_SINGLE_PASS_STEREO", "STEREO_MULTIVIEW_ON", "STEREO_CUBEMAP_RENDER_ON", "DEBUG_DISPLAY", "INSTANCING_ON", "_CASTING_PUNCTUAL_LIGHT_SHADOW"],
    propertyNames: ["_Color", "_Multiply", "_Texture", "_RGBRGBA", "_Main_Texture_No", "_Custom_Data_Offset_Use", "_ZWrite_Mode", "_Cull_Mode", "_ZTest_Mode", "_ZOffsetFactor", "_ZOffsetUnits"],
    sourceBlend: 1, destinationBlend: 10,
  },
  "dsfx/fx_shader_alphablend_0": {
    programBlobSha256: "65b652e79bbcce530203321da335999c19212fc25807233878f6853813931576",
    sourceReference: { bundleSha256: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c", serializedFile: "CAB-428091522b4007f213bf16532c4528a1", objectId: "-660637482714961986" },
    propertyNames: ["_Color", "_Multiply", "_Texture", "_RGBRGBA", "_Main_Texture_No", "_Custom_Data_Offset_Use", "_ZWrite_Mode", "_Cull_Mode", "_ZTest_Mode", "_ZOffsetFactor", "_ZOffsetUnits"],
    sourceBlend: 5, destinationBlend: 10,
  },
});

const profileDsfxWakamoEyeWhiteDefault = Object.freeze({
  materialReference: "46acf4c44d1cfbbdbdcc20d8227397323273739b1021442ddd77c6c4e4af3816:cab-0ff8a11237bb688b3a3deddb961cd2a6:1142847250617954324",
  shaderReference: "08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c:cab-428091522b4007f213bf16532c4528a1:3898777625326355543",
  materialVariant: "wakamo-eye-white-default",
  floats: Object.freeze({
    _AlphaClip: 0, _Blend: 0, _BumpScale: 1, _Cull: 2, _Cull_Mode: 2, _Custom_Data_Offset_Use: 1,
    _Cutoff: 0.5, _DetailNormalMapScale: 1, _DstBlend: 0, _GlossMapScale: 1, _Glossiness: 0,
    _GlossyReflections: 1, _Main_Texture_No: 1, _Metallic: 0, _Multiply: 1, _OcclusionStrength: 1,
    _Parallax: 0.019999999552965164, _RGBRGBA: 0, _SmoothnessTextureChannel: 0, _SpecularHighlights: 1,
    _SrcBlend: 1, _Surface: 0, _UVSec: 0, _WorkflowMode: 1, _ZOffsetFactor: 0, _ZOffsetUnits: 0,
    _ZTest_Mode: 4, _ZWrite: 1, _ZWrite_Mode: 0,
  }),
  colors: Object.freeze({
    _Color: Object.freeze({ r: 6.264151096343994, g: 1.3296549320220947, b: 1.3296549320220947, a: 1 }),
    _EmissionColor: Object.freeze({ r: 0, g: 0, b: 0, a: 0 }),
    _SpecColor: Object.freeze({ r: 0.19999995827674866, g: 0.19999995827674866, b: 0.19999995827674866, a: 1 }),
  }),
});
const profileDsfxWakamoEyeInertProperties = new Set([
  "_GlossyReflections", "_OcclusionStrength", "_SpecularHighlights", "_EmissionColor", "_SpecColor",
]);

// AlphaBlend_0 has only these three source-proven translated states.  Keep
// the complete state shape here so a hand-edited profile cannot turn one
// accepted flag into an arbitrary depth/cull combination.
const profileDsfxAlphaBlend0RenderStateVariants = Object.freeze({
  "static-default": Object.freeze({ depthWrite: false, depthTest: false, depthFunction: "disabled", cullMode: "off", doubleSided: true }),
  "depth-tested-back-cull": Object.freeze({ depthWrite: false, depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false }),
  "depth-tested-off-double-sided": Object.freeze({ depthWrite: false, depthTest: true, depthFunction: "less-equal", cullMode: "off", doubleSided: true }),
});

const profileDsfxAlphaBlend0Gles3Programs = Object.freeze([
  { blobIndex: 2, programHash: "2c09665c51d86387e06473c1585d28c889a95e1c5fa71cecf0cde66c20b722c6", programDataLength: 5036, recordSha256: "ab0e0ec212bfe8ae6c45530df60a04c95c2c7866df036eb573f18ccc871ed017" },
  { blobIndex: 3, programHash: "ed9223bce42bd6c85d0c76e5ac38d1084b9b90e91c15c6c27689423b738363cd", programDataLength: 4478, recordSha256: "f16a1b6cfc5d32592bb1d825e727a1e4cec28da95f952ae8dedd65b208f73b30" },
  { blobIndex: 6, programHash: "1c9c2c9ac313c8108d0c27abc7647ded21bb5a993747d1551d11a9d543f24643", programDataLength: 4681, recordSha256: "50e396be9c4bb52a51fc2ea71fc32d8cbf51dced0c470ddfc8c97f7bb23b664d" },
  { blobIndex: 7, programHash: "ec5da5e2e0c2ecbeabeed1cdd694cfedbf195d0b0a97627ce907f57ea568dbbd", programDataLength: 4262, recordSha256: "5380845aecc60afa3ee27ef5832833af4d1a10fa429ac6f9c781529762474c64" },
]);

// AlphaBlend_Add is source-exact rather than a same-name fallback. These
// records are the complete GLES3 Forward/ShadowCaster static and instanced
// set from the authoritative extraction/evidence pair.
const profileDsfxAlphaBlendAddGles3Programs = Object.freeze([
  {
    blobIndex: 2, offset: 2568, size: 5096, segment: 0, sourceMap: 57,
    version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "df04b3b74a13eb8720e8c9e3dbb4adf56c4cad61c60c691a2c59cf7aa59c1659", programDataLength: 5055,
    recordSha256: "56fa177b4bc146116debfca1afab21a995b302f8e92ea27074ff53dabb7684d0",
    parameterBlobIndex: 0, parameterRecordSha256: "a4e32c89ae00a77e44f772e5f50b371d34028243345b2231c8817beb0bce74d3",
    passIndex: 0, passName: "", stateName: "Forward", playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0,
    shaderRequirements: 227, keywordIndices: [], keywordNames: [],
    attributes: ["in_POSITION0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD3", "vs_COLOR0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "unity_LODFade", "unity_WorldTransformParams", "unity_RenderingLayer", "unity_LightData", "unity_LightIndices", "unity_ProbesOcclusion", "unity_SpecCube0_HDR", "unity_SpecCube1_HDR", "unity_SpecCube0_BoxMax", "unity_SpecCube0_BoxMin", "unity_SpecCube0_ProbePosition", "unity_SpecCube1_BoxMax", "unity_SpecCube1_BoxMin", "unity_SpecCube1_ProbePosition", "unity_LightmapST", "unity_DynamicLightmapST", "unity_SHAr", "unity_SHAg", "unity_SHAb", "unity_SHBr", "unity_SHBg", "unity_SHBb", "unity_SHC", "hlslcc_mtx4x4unity_MatrixPreviousM", "hlslcc_mtx4x4unity_MatrixPreviousMI", "unity_MotionVectorsParams", "_Color", "_Texture_ST", "_ZTest_Mode", "_Cull_Mode", "_ZWrite_Mode", "_ZOffsetUnits", "_ZOffsetFactor", "_Multiply", "_RGBRGBA", "_Custom_Data_Offset_Use", "_Main_Texture_No", "_Texture"],
  },
  {
    blobIndex: 3, offset: 7664, size: 4560, segment: 0, sourceMap: 57,
    version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "4c734b1eddd609e21119a81d0e3cf0fb4e3c8b3ae981e741c02eeaae72ec5bd3", programDataLength: 4497,
    recordSha256: "c6f83c938ddfd905863e50f341ba8c445568254664402ae174ac2c235af17098",
    parameterBlobIndex: 1, parameterRecordSha256: "5db8a8a64c9a4eb5ca694006a5f4cb90d57b6421d602cb025745d389fe67c865",
    passIndex: 0, passName: "", stateName: "Forward", playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1,
    shaderRequirements: 2275, keywordIndices: [5], keywordNames: ["INSTANCING_ON"],
    attributes: ["in_POSITION0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD3", "vs_COLOR0", "vs_SV_InstanceID0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "unity_Builtins0Array", "_Color", "_Texture_ST", "_ZTest_Mode", "_Cull_Mode", "_ZWrite_Mode", "_ZOffsetUnits", "_ZOffsetFactor", "_Multiply", "_RGBRGBA", "_Custom_Data_Offset_Use", "_Main_Texture_No", "_Texture"],
  },
  {
    blobIndex: 6, offset: 14356, size: 4660, segment: 0, sourceMap: 59,
    version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "13e560d4e67cdd506232363684014b837d096c675123816d7d52d6570cfd775e", programDataLength: 4620,
    recordSha256: "1aa2a0449aa09764b09a525ed943b4b095d6ffdae1563cd2bcdfc9a037b5b713",
    parameterBlobIndex: 4, parameterRecordSha256: "697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17",
    passIndex: 1, passName: "", stateName: "ShadowCaster", playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0,
    shaderRequirements: 227, keywordIndices: [], keywordNames: [],
    attributes: ["in_POSITION0", "in_NORMAL0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD2", "vs_COLOR0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "unity_LODFade", "unity_WorldTransformParams", "unity_RenderingLayer", "unity_LightData", "unity_LightIndices", "unity_ProbesOcclusion", "unity_SpecCube0_HDR", "unity_SpecCube1_HDR", "unity_SpecCube0_BoxMax", "unity_SpecCube0_BoxMin", "unity_SpecCube0_ProbePosition", "unity_SpecCube1_BoxMax", "unity_SpecCube1_BoxMin", "unity_SpecCube1_ProbePosition", "unity_LightmapST", "unity_DynamicLightmapST", "unity_SHAr", "unity_SHAg", "unity_SHAb", "unity_SHBr", "unity_SHBg", "unity_SHBb", "unity_SHC", "hlslcc_mtx4x4unity_MatrixPreviousM", "hlslcc_mtx4x4unity_MatrixPreviousMI", "unity_MotionVectorsParams"],
  },
  {
    blobIndex: 7, offset: 19016, size: 4264, segment: 0, sourceMap: 59,
    version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "a1368f654663b3060b14b33fc3228e12159327792845877575f693c1c50a6c53", programDataLength: 4201,
    recordSha256: "b3b2b3aecc12c5fb8c248c1dd530c4e6521d43b798f1cab41ff2f81060b4d53f",
    parameterBlobIndex: 5, parameterRecordSha256: "48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51",
    passIndex: 1, passName: "", stateName: "ShadowCaster", playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1,
    shaderRequirements: 2275, keywordIndices: [5], keywordNames: ["INSTANCING_ON"],
    attributes: ["in_POSITION0", "in_NORMAL0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD2", "vs_COLOR0", "vs_SV_InstanceID0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "unity_Builtins0Array"],
  },
]);

const profileDsfxAlphaBlendAddRenderStateVariants = Object.freeze({
  "static-default": Object.freeze({ depthWrite: false, depthTest: false, depthFunction: "disabled", cullMode: "off", doubleSided: true }),
  "depth-tested-back-cull": Object.freeze({ depthWrite: false, depthTest: true, depthFunction: "less-equal", cullMode: "back", doubleSided: false }),
  "depth-tested-off-double-sided": Object.freeze({ depthWrite: false, depthTest: true, depthFunction: "less-equal", cullMode: "off", doubleSided: true }),
});
const profileDsfxAlphaBlend0InertProperties = new Set([
  "_GlossyReflections", "_EnvironmentReflections",
  "_LightingEnabled", "_OcclusionStrength", "_SpecularHighlights",
  "_EmissionColor", "_SpecColor",
]);

// Additive_0 is the only DSFX static layer whose extraction is retained in
// the published profile by the source pipeline. These four records are the
// complete GLES3 Forward/ShadowCaster static and instanced set. Keep the
// binding fields here as well as the program hashes: a matching blob hash is
// not enough if a profile has been edited to point at a different pass or
// parameter record.
const profileDsfxAdditive0Gles3Programs = Object.freeze([
  {
    blobIndex: 2, offset: 2568, size: 4660, segment: 0, sourceMap: 57,
    version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "3385102c84a54b6579e34b8c667635094f353a9802770da2f58e91fbbbc60026", programDataLength: 4618,
    recordSha256: "c3c0a70448fed498fee19ae556974d594a37edf16e1ac47ea2f364dc5b4a8b1d",
    parameterBlobIndex: 0, parameterRecordSha256: "619c2de6aa2781b2363fe443f77609736903c60335e25c5eaa3d2d705c9e0173",
    passIndex: 0, passName: "", stateName: "Forward", playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0,
    shaderRequirements: 227, keywordIndices: [], keywordNames: [],
    attributes: ["in_POSITION0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD3", "vs_TEXCOORD4", "vs_COLOR0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "unity_LODFade", "unity_WorldTransformParams", "unity_RenderingLayer", "unity_LightData", "unity_LightIndices", "unity_ProbesOcclusion", "unity_SpecCube0_HDR", "unity_SpecCube1_HDR", "unity_SpecCube0_BoxMax", "unity_SpecCube0_BoxMin", "unity_SpecCube0_ProbePosition", "unity_SpecCube1_BoxMax", "unity_SpecCube1_BoxMin", "unity_SpecCube1_ProbePosition", "unity_LightmapST", "unity_DynamicLightmapST", "unity_SHAr", "unity_SHAg", "unity_SHAb", "unity_SHBr", "unity_SHBg", "unity_SHBb", "unity_SHC", "hlslcc_mtx4x4unity_MatrixPreviousM", "hlslcc_mtx4x4unity_MatrixPreviousMI", "unity_MotionVectorsParams", "_Texture_ST", "_Color", "_ZOffsetFactor", "_ZOffsetUnits", "_ZWrite_Mode", "_Cull_Mode", "_ZTest_Mode", "_Custom_Data_Offset_Use"],
  },
  {
    blobIndex: 3, offset: 7228, size: 4120, segment: 0, sourceMap: 57,
    version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "fa6ec097af34d57cab64d105f411ac41bde7991de417ba1c02413a4ed88baabd", programDataLength: 4060,
    recordSha256: "b8877e78e3acacc5e0891dbfb2d43f8db989f6b1614454417e4dd5c9b972e77f",
    parameterBlobIndex: 1, parameterRecordSha256: "1fe7d3f57ddd22705f4b97fd0c5c86e2c43af931a39f3718047ae65bc4b7fcda",
    passIndex: 0, passName: "", stateName: "Forward", playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1,
    shaderRequirements: 2275, keywordIndices: [5], keywordNames: ["INSTANCING_ON"],
    attributes: ["in_POSITION0", "in_TEXCOORD0", "in_TEXCOORD1", "in_COLOR0", "vs_TEXCOORD3", "vs_TEXCOORD4", "vs_COLOR0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "unity_Builtins0Array", "_Texture_ST", "_Color", "_ZOffsetFactor", "_ZOffsetUnits", "_ZWrite_Mode", "_Cull_Mode", "_ZTest_Mode", "_Custom_Data_Offset_Use"],
  },
  {
    blobIndex: 6, offset: 13480, size: 4420, segment: 0, sourceMap: 3,
    version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5", programDataLength: 4379,
    recordSha256: "9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4",
    parameterBlobIndex: 4, parameterRecordSha256: "697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17",
    passIndex: 1, passName: "", stateName: "ShadowCaster", playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0,
    shaderRequirements: 227, keywordIndices: [], keywordNames: [],
    attributes: ["in_POSITION0", "in_NORMAL0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_ObjectToWorld", "hlslcc_mtx4x4unity_WorldToObject", "unity_LODFade", "unity_WorldTransformParams", "unity_RenderingLayer", "unity_LightData", "unity_LightIndices", "unity_ProbesOcclusion", "unity_SpecCube0_HDR", "unity_SpecCube1_HDR", "unity_SpecCube0_BoxMax", "unity_SpecCube0_BoxMin", "unity_SpecCube0_ProbePosition", "unity_SpecCube1_BoxMax", "unity_SpecCube1_BoxMin", "unity_SpecCube1_ProbePosition", "unity_LightmapST", "unity_DynamicLightmapST", "unity_SHAr", "unity_SHAg", "unity_SHAb", "unity_SHBr", "unity_SHBg", "unity_SHBb", "unity_SHC", "hlslcc_mtx4x4unity_MatrixPreviousM", "hlslcc_mtx4x4unity_MatrixPreviousMI", "unity_MotionVectorsParams"],
  },
  {
    blobIndex: 7, offset: 17900, size: 4020, segment: 0, sourceMap: 3,
    version: 202012090, platform: 9, platformName: "GLES3Plus", gpuProgramType: 4, gpuProgramTypeName: "GLES3",
    programHash: "c398892908c135f4a88395ef710f0c25d6ba2b6da763f8850935134ac325ddc1", programDataLength: 3960,
    recordSha256: "1e7b1e587aa7e0369a0415df992f515cbde6fd63b4db544a0a3e8ea76de8abc0",
    parameterBlobIndex: 5, parameterRecordSha256: "48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51",
    passIndex: 1, passName: "", stateName: "ShadowCaster", playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1,
    shaderRequirements: 2275, keywordIndices: [5], keywordNames: ["INSTANCING_ON"],
    attributes: ["in_POSITION0", "in_NORMAL0"],
    uniforms: ["hlslcc_mtx4x4unity_MatrixVP", "unity_BaseInstanceID", "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "unity_Builtins0Array"],
  },
]);

const profileDsfxStaticStateProperties = new Set([
  "_AlphaClip", "_Blend", "_BlendOp", "_ColorMode", "_Cull", "_Cull_Mode", "_Cutoff", "_DstBlend",
  "_DstBlendAlpha", "_Main_Texture_No", "_Mode", "_Multiply", "_QueueOffset", "_RGBRGBA", "_SrcBlend",
  "_SrcBlendAlpha", "_Surface", "_ZOffsetFactor", "_ZOffsetUnits", "_ZTest", "_ZTest_Mode", "_ZWrite",
  "_ZWrite_Mode",
]);
const profileDsfxStaticGatePattern = /(?:custom.*(?:use|enabled|mode)$|(?:distortion|softparticles|camera.*fad(?:e|ing)|emission|lighting|flipbook|glitch|step|disappear).*(?:use|enabled|mode|blending)$)/i;
const profileDsfxStaticValuePattern = /(?:custom|distort|^_dis_|speed|power|strength|camera.*fade|softparticle|flipbook|emission|lighting|step|disappear|glitch|vertex|reflect|spec|environment|glossy|radius|intensity|time)/i;

function profileDsfxGlslIdentifier(glsl, name) {
  return new RegExp(`\\b${name}\\b`).test(glsl);
}

function assertProfileDsfxShaderExtraction(slot, rule) {
  const additive = rule === profileDsfxStaticAdapters["dsfx/fx_shader_additive_0"];
  const alphaBlendAdd = rule === profileDsfxStaticAdapters["dsfx/fx_shader_alphablend_add"];
  const alphaBlend0 = rule === profileDsfxStaticAdapters["dsfx/fx_shader_alphablend_0"];
  const strictExtraction = additive || alphaBlendAdd;
  if (!strictExtraction && !alphaBlend0) return new Set();
  const extraction = slot.dsfxShaderExtraction;
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || (strictExtraction ? extraction.unityVersion !== "2021.3" : !/^2021\.3(?:\.|$)/.test(String(extraction.unityVersion ?? "")))
    || (strictExtraction ? extraction.fingerprint !== rule.fingerprint : !/^[0-9a-f]{64}$/i.test(String(extraction.fingerprint ?? "")))
    || String(extraction.compressedBlobSha256 ?? "").toLowerCase() !== rule.programBlobSha256
    || normalizedProfileReferenceKey(extraction.shader?.sourceReference) !== normalizedProfileReferenceKey(rule.sourceReference)
    || normalizedProfileShaderIdentity(extraction.shader?.name) !== (additive ? "dsfx/fx_shader_additive_0" : alphaBlendAdd ? "dsfx/fx_shader_alphablend_add" : "dsfx/fx_shader_alphablend_0")
    || !exactArray(extraction.shader?.keywordNames, strictExtraction ? rule.shaderKeywordNames : [])
    || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs)
    || !Array.isArray(extraction.bindings)) {
    throw new Error(`Profile DSFX static adapter has no complete source extraction for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const expectedPrograms = additive
    ? profileDsfxAdditive0Gles3Programs
    : alphaBlendAdd ? profileDsfxAlphaBlendAddGles3Programs : profileDsfxAlphaBlend0Gles3Programs;
  const gles3Programs = extraction.gles3Programs;
  if (gles3Programs.length !== expectedPrograms.length) {
    throw new Error(`Profile DSFX static adapter has ${gles3Programs.length} GLES3 programs; expected ${expectedPrograms.length}.`);
  }
  const allGles3Programs = extraction.programs.filter((program) => program?.kind === "program" && program.platform === 9 && program.gpuProgramType === 4);
  if (allGles3Programs.length !== expectedPrograms.length) {
    throw new Error("Profile DSFX static adapter has incomplete GLES3 program records.");
  }
  const gles3Bindings = extraction.bindings.filter((binding) => binding?.platform === 9 && binding.gpuProgramType === 4);
  if (gles3Bindings.length !== expectedPrograms.length) {
    throw new Error("Profile DSFX static adapter has incomplete GLES3 binding evidence.");
  }
  const sourceReferenceMatches = (value) => normalizedProfileReferenceKey(value) === normalizedProfileReferenceKey(rule.sourceReference);
  const selectedNames = (value) => Array.isArray(value)
    ? value.map((item) => typeof item === "string" ? item : item?.name)
    : null;
  for (const [index, expected] of expectedPrograms.entries()) {
    const program = gles3Programs[index];
    const exactProgramFields = strictExtraction && [
      "version", "platformName", "gpuProgramTypeName", "sourceMap", "offset", "size", "segment",
    ].some((field) => program?.[field] !== expected[field]);
    if (program?.kind !== "program" || program.platform !== 9 || program.gpuProgramType !== 4
      || program.blobIndex !== expected.blobIndex || program.programHash !== expected.programHash
      || program.programDataSha256 !== expected.programHash || program.programDataLength !== expected.programDataLength
      || program.recordSha256 !== expected.recordSha256 || (strictExtraction && exactProgramFields)
      || (strictExtraction && !sourceReferenceMatches(program.sourceReference)) || (strictExtraction && !exactArray(program.keywords, expected.keywordNames))
      || typeof program.glsl !== "string" || !program.glsl.includes("#version 300 es")) {
      throw new Error(`Profile DSFX static adapter has an incomplete GLES3 program ${index}.`);
    }
    if (strictExtraction) {
      const attributes = selectedNames(program.attributes ?? program.requiredAttributes);
      const uniforms = selectedNames(program.uniforms ?? program.requiredUniforms);
      if ((attributes && !exactArray(attributes, expected.attributes)) || (uniforms && !exactArray(uniforms, expected.uniforms))) {
        throw new Error(`Profile DSFX static adapter has incomplete GLES3 interface metadata for program ${index}.`);
      }
      if (program.glsl.length !== expected.programDataLength || !program.glsl.includes("#ifdef VERTEX") || !program.glsl.includes("#ifdef FRAGMENT")
        || expected.attributes.some((name) => !profileDsfxGlslIdentifier(program.glsl, name))
        || expected.uniforms.some((name) => !profileDsfxGlslIdentifier(program.glsl, name))) {
        throw new Error(`Profile DSFX static adapter has incomplete ${additive ? "Additive_0" : "AlphaBlend_Add"} GLSL for program ${index}.`);
      }
      for (const forbidden of ["_Time", "unity_Time", "gl_FragCoord", "gl_FragDepth", "gl_FragDepthEXT", "sampler2DShadow", "samplerCubeShadow", "textureProj"]) {
        if (profileDsfxGlslIdentifier(program.glsl, forbidden)) {
          throw new Error(`Profile DSFX static adapter ${additive ? "Additive_0" : "AlphaBlend_Add"} GLSL uses forbidden dynamic/depth input ${forbidden}.`);
        }
      }
    }
    const record = allGles3Programs.find((candidate) => candidate.blobIndex === expected.blobIndex);
    if (!record || record.programHash !== expected.programHash || record.programDataSha256 !== expected.programHash
      || record.programDataLength !== expected.programDataLength || record.recordSha256 !== expected.recordSha256
      || (strictExtraction && !sourceReferenceMatches(record.sourceReference))
      || typeof record.glsl !== "string" || (strictExtraction && record.glsl.length !== expected.programDataLength)
      || !record.glsl.includes("#version 300 es")) {
      throw new Error(`Profile DSFX static adapter is missing GLES3 program record ${expected.blobIndex}.`);
    }
    if (strictExtraction) {
      const binding = gles3Bindings.find((candidate) => candidate.blobIndex === expected.blobIndex);
      if (!binding || binding.subShaderIndex !== 0 || binding.passIndex !== expected.passIndex
        || binding.passName !== expected.passName || binding.stateName !== expected.stateName || binding.stage !== "vertex"
        || binding.playerGroupIndex !== expected.playerGroupIndex || binding.playerIndex !== expected.playerIndex
        || binding.subProgramIndex !== expected.subProgramIndex || binding.parameterBlobIndex !== expected.parameterBlobIndex
        || binding.gpuProgramTypeName !== "GLES3" || binding.shaderRequirements !== expected.shaderRequirements
        || binding.platform !== 9 || binding.gpuProgramType !== 4
        || binding.programHash !== expected.programHash || binding.programRecordSha256 !== expected.recordSha256
        || binding.parameterRecordSha256 !== expected.parameterRecordSha256 || binding.gles3ProgramHash !== expected.programHash
        || !exactArray(binding.keywordIndices, expected.keywordIndices) || !exactArray(binding.keywordNames, expected.keywordNames)
        || !sourceReferenceMatches(binding.sourceReference)) {
        throw new Error(`Profile DSFX static adapter has incomplete ${additive ? "Additive_0" : "AlphaBlend_Add"} binding metadata for program ${expected.blobIndex}.`);
      }
    }
  }
  const glsl = [...gles3Programs, ...allGles3Programs].map((program) => program.glsl ?? "").join("\n");
  for (const required of [
    "_Texture", "_Color", "_Custom_Data_Offset_Use",
    "_ShadowBias", "_LightDirection", "_ShadowCoordModifier", "hlslcc_mtx4x4unity_MatrixVP",
  ]) {
    if (!profileDsfxGlslIdentifier(glsl, required)) {
      throw new Error(`Profile DSFX static adapter GLSL is missing required ${required}.`);
    }
  }
  if (alphaBlend0 || additive) {
    for (const inert of profileDsfxAlphaBlend0InertProperties) {
      if (profileDsfxGlslIdentifier(glsl, inert)) {
        throw new Error(`Profile DSFX static adapter GLSL declares or consumes inert property ${inert}.`);
      }
    }
  }
  if (alphaBlendAdd && slot.dsfxMaterialVariant === profileDsfxWakamoEyeWhiteDefault.materialVariant) {
    for (const inert of profileDsfxWakamoEyeInertProperties) {
      if (profileDsfxGlslIdentifier(glsl, inert)) {
        throw new Error(`Profile DSFX AlphaBlend_Add GLSL declares or consumes Wakamo inert property ${inert}.`);
      }
    }
    return profileDsfxWakamoEyeInertProperties;
  }
  return alphaBlend0 || additive ? profileDsfxAlphaBlend0InertProperties : new Set();
}

function profileDsfxNumericProperties(slot) {
  const entries = [
    ...Object.entries(slot.materialProperties?.floats ?? {}),
    ...Object.entries(slot.materialProperties?.ints ?? {}),
  ];
  return new Map(entries.flatMap(([name, value]) => {
    const number = Number(value);
    return Number.isFinite(number) ? [[name, number]] : [];
  }));
}

function profileDsfxDynamicGates(name, names) {
  const normalized = name.toLowerCase();
  if (normalized.includes('custom') || normalized.includes('disappear')) return names.filter(candidate => /custom|disappear/i.test(candidate) && profileDsfxStaticGatePattern.test(candidate));
  if (normalized.includes('distort') || normalized.startsWith('_dis_')) return names.filter(candidate => /distort|^_dis_/i.test(candidate) && profileDsfxStaticGatePattern.test(candidate));
  if (normalized.includes('camera') || normalized.includes('fade')) return names.filter(candidate => /camera.*fad(?:e|ing)/i.test(candidate) && profileDsfxStaticGatePattern.test(candidate));
  if (normalized.includes('softparticle')) return names.filter(candidate => /softparticle/i.test(candidate) && profileDsfxStaticGatePattern.test(candidate));
  if (normalized.includes('flipbook')) return names.filter(candidate => /flipbook/i.test(candidate) && profileDsfxStaticGatePattern.test(candidate));
  if (normalized.includes('emission')) return names.filter(candidate => /emission/i.test(candidate) && profileDsfxStaticGatePattern.test(candidate));
  if (normalized.includes('lighting')) return names.filter(candidate => /lighting/i.test(candidate) && profileDsfxStaticGatePattern.test(candidate));
  if (normalized.includes('step')) return names.filter(candidate => /step/i.test(candidate) && profileDsfxStaticGatePattern.test(candidate));
  return [];
}

function profileDsfxDynamicEvidence(slot, rule, inertProperties = new Set()) {
  const serializedValues = [
    ...Object.entries(slot.materialProperties?.floats ?? {}),
    ...Object.entries(slot.materialProperties?.ints ?? {}),
  ];
  for (const [name, value] of serializedValues) {
    if ((profileDsfxStaticValuePattern.test(name) || profileDsfxStaticGatePattern.test(name)) && !Number.isFinite(Number(value))) {
      return `${name} dynamic value is unresolved`;
    }
  }
  const values = profileDsfxNumericProperties(slot);
  const names = [...values.keys()];
  const declared = new Set(rule.propertyNames);
  for (const [name, value] of values) {
    if (profileDsfxStaticStateProperties.has(name)) continue;
    if (inertProperties.has(name)) continue;
    if (profileDsfxStaticGatePattern.test(name)) {
      if (value !== 0) return `${name} dynamic gate is active (${value})`;
      continue;
    }
    if (!profileDsfxStaticValuePattern.test(name) || value === 0) continue;
    const gates = profileDsfxDynamicGates(name, names);
    if (gates.length && gates.every(gate => values.get(gate) === 0)) continue;
    if (name === '_Step_Power' && !gates.length && !declared.has(name)) continue;
    return `${name} dynamic value is active (${value})`;
  }
  for (const [name, color] of Object.entries(slot.materialProperties?.colors ?? {})) {
    if (name === '_Color' || !profileDsfxStaticValuePattern.test(name)) continue;
    if (inertProperties.has(name)) continue;
    const components = [color?.r, color?.g, color?.b, color?.a].map(value => {
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    });
    const active = components.some(value => value === null || value !== 0);
    if (!active) continue;
    const gates = profileDsfxDynamicGates(name, names);
    if (gates.length && gates.every(gate => values.get(gate) === 0)) continue;
    return `${name} dynamic color is active`;
  }
  return null;
}

function profileDsfxStaticRule(slot) {
  return profileDsfxStaticAdapters[normalizedProfileShaderIdentity(slot?.sourceShaderParsedName ?? slot?.sourceShaderName)];
}

function assertDsfxStaticShaderAdapter(slot) {
  const rule = profileDsfxStaticRule(slot);
  if (!rule) throw new Error(`Profile DSFX static adapter has an unverified shader identity for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  if (String(slot.shaderProgramBlobSha256 ?? '').toLowerCase() !== rule.programBlobSha256
    || normalizedProfileReferenceKey(slot.sourceShaderReference) !== normalizedProfileReferenceKey(rule.sourceReference)) {
    throw new Error(`Profile DSFX static adapter has an unverified source identity or program version for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const names = slot.materialProperties?.keywords;
  if (!Array.isArray(names)) throw new Error(`Profile DSFX static adapter has no exact shader keyword evidence for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  if (names.length) throw new Error(`Profile DSFX static adapter has active shader keywords for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  const shaderIdentity = normalizedProfileShaderIdentity(slot?.sourceShaderParsedName ?? slot?.sourceShaderName);
  const isAdditive = shaderIdentity === "dsfx/fx_shader_additive_0";
  const isAlphaBlendAdd = shaderIdentity === "dsfx/fx_shader_alphablend_add";
  const hasWakamoWhiteDefaultSource = isAlphaBlendAdd
    && normalizedProfileReferenceKey(slot.sourceMaterialReference) === profileDsfxWakamoEyeWhiteDefault.materialReference;
  if (slot.dsfxMaterialVariant !== undefined && slot.dsfxMaterialVariant !== null
    && slot.dsfxMaterialVariant !== profileDsfxWakamoEyeWhiteDefault.materialVariant) {
    throw new Error(`Profile DSFX static adapter has an unknown material variant for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const isWakamoWhiteDefault = slot.dsfxMaterialVariant === profileDsfxWakamoEyeWhiteDefault.materialVariant;
  if (isWakamoWhiteDefault !== hasWakamoWhiteDefaultSource) {
    throw new Error(`Profile DSFX AlphaBlend_Add white-default variant is not bound to the exact Wakamo eye source material.`);
  }
  const texture = slot.materialProperties?.textures?.find(item => item.name === '_Texture');
  if (isWakamoWhiteDefault) {
    if (!texture?.texture || String(texture.texture.pathId) !== '0' || texture.textureReference !== null
      || String(texture.texture.file ?? '').toLowerCase() !== 'cab-0ff8a11237bb688b3a3deddb961cd2a6'
      || texture.scale?.x !== 1 || texture.scale?.y !== 1 || texture.offset?.x !== 0 || texture.offset?.y !== 0) {
      throw new Error(`Profile DSFX AlphaBlend_Add white-default variant has a tampered null _Texture pointer or transform.`);
    }
  } else if (!texture?.texture || String(texture.texture.pathId) === '0' || !texture.textureReference) {
    throw new Error(`Profile DSFX static adapter has no exact _Texture identity for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  } else if (String(texture.texture.file ?? '').toLowerCase() !== String(texture.textureReference.serializedFile ?? '').toLowerCase()
    || String(texture.texture.pathId) !== String(texture.textureReference.objectId)) {
    throw new Error(`Profile DSFX static adapter has a mismatched _Texture pointer for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
  if (isAdditive) {
    const properties = slot.materialProperties ?? {};
    const propertyNames = [
      ...Object.keys(properties.floats ?? {}),
      ...Object.keys(properties.ints ?? {}),
      ...Object.keys(properties.colors ?? {}),
      ...(properties.textures ?? []).map(item => item.name),
    ];
    if (propertyNames.length !== profileDsfxStaticAdapters["dsfx/fx_shader_additive_0"].propertyNames.length
      || new Set(propertyNames).size !== propertyNames.length
      || profileDsfxStaticAdapters["dsfx/fx_shader_additive_0"].propertyNames.some(name => !propertyNames.includes(name))) {
      throw new Error(`Profile DSFX Additive_0 adapter has an unverified material property set for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
    }
    const scalars = profileDsfxNumericProperties(slot);
    if (Object.keys(properties.ints ?? {}).length
      || scalars.get("_Custom_Data_Offset_Use") !== 0
      || scalars.get("_ZWrite_Mode") !== 0
      || scalars.get("_ZOffsetFactor") !== 0
      || scalars.get("_ZOffsetUnits") !== 0
      || scalars.get("_ZTest_Mode") !== 4
      || ![0, 2].includes(scalars.get("_Cull_Mode"))) {
      throw new Error(`Profile DSFX Additive_0 adapter has an unverified material scalar state for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
    }
    if (!Number.isFinite(Number(texture.scale?.x)) || !Number.isFinite(Number(texture.scale?.y))
      || !Number.isFinite(Number(texture.offset?.x)) || !Number.isFinite(Number(texture.offset?.y))) {
      throw new Error(`Profile DSFX Additive_0 adapter has an unresolved _Texture transform for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
    }
    const sourceTint = colorArray(properties.colors?._Color);
    const adapterTint = slot.adapterSettings?.baseColorTint;
    if (!sourceTint || !Array.isArray(adapterTint) || !exactArray(sourceTint, adapterTint)) {
      throw new Error(`Profile DSFX Additive_0 adapter has an unverified active _Color tint for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
    }
    if (slot.adapterSettings?.dsfxMultiply !== null && slot.adapterSettings?.dsfxMultiply !== undefined) {
      throw new Error(`Profile DSFX Additive_0 adapter has an unexpected _Multiply activation for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
    }
  }
  if (isAlphaBlendAdd) {
    const properties = slot.materialProperties ?? {};
    const floats = properties.floats ?? {};
    const colors = properties.colors ?? {};
    const propertyNames = [
      ...Object.keys(floats),
      ...Object.keys(properties.ints ?? {}),
      ...Object.keys(colors),
      ...(properties.textures ?? []).map(item => item.name),
    ];
    const expectedProperties = isWakamoWhiteDefault
      ? [...Object.keys(profileDsfxWakamoEyeWhiteDefault.floats), ...Object.keys(profileDsfxWakamoEyeWhiteDefault.colors), "_Texture"]
      : profileDsfxStaticAdapters["dsfx/fx_shader_alphablend_add"].propertyNames;
    if (propertyNames.length !== expectedProperties.length
      || new Set(propertyNames).size !== propertyNames.length
      || expectedProperties.some(name => !propertyNames.includes(name))
      || Object.keys(properties.ints ?? {}).length
      || (properties.textures ?? []).length !== 1
      || properties.textures?.[0]?.name !== "_Texture") {
      throw new Error(`Profile DSFX AlphaBlend_Add adapter has an unverified material property set for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
    }
    const scalars = profileDsfxNumericProperties(slot);
    const expectedWakamoFloats = profileDsfxWakamoEyeWhiteDefault.floats;
    if (scalars.get("_Custom_Data_Offset_Use") !== (isWakamoWhiteDefault ? 1 : 0)
      || scalars.get("_ZWrite_Mode") !== 0
      || scalars.get("_ZOffsetFactor") !== 0
      || scalars.get("_ZOffsetUnits") !== 0
      || scalars.get("_ZTest_Mode") !== 4
      || (isWakamoWhiteDefault ? scalars.get("_Cull_Mode") !== 2 : ![0, 2].includes(scalars.get("_Cull_Mode")))
      || ![0, 1].includes(scalars.get("_RGBRGBA"))
      || ![0, 1].includes(scalars.get("_Main_Texture_No"))
      || !Number.isFinite(scalars.get("_Multiply"))
      || (isWakamoWhiteDefault && (Object.keys(floats).length !== Object.keys(expectedWakamoFloats).length
        || Object.entries(expectedWakamoFloats).some(([name, value]) => Number(floats[name]) !== value)))) {
      throw new Error(`Profile DSFX AlphaBlend_Add adapter has an unverified material scalar state for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
    }
    if (!Number.isFinite(Number(texture.scale?.x)) || !Number.isFinite(Number(texture.scale?.y))
      || !Number.isFinite(Number(texture.offset?.x)) || !Number.isFinite(Number(texture.offset?.y))) {
      throw new Error(`Profile DSFX AlphaBlend_Add adapter has an unresolved _Texture transform for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
    }
    const sourceTint = colorArray(properties.colors?._Color);
    const adapterTint = slot.adapterSettings?.baseColorTint;
    if (!sourceTint || !Array.isArray(adapterTint) || !exactArray(sourceTint, adapterTint)) {
      throw new Error(`Profile DSFX AlphaBlend_Add adapter has an unverified active _Color tint for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
    }
    if (!Number.isFinite(Number(slot.adapterSettings?.dsfxMultiply))
      || Number(slot.adapterSettings.dsfxMultiply) !== scalars.get("_Multiply")) {
      throw new Error(`Profile DSFX AlphaBlend_Add adapter has an unverified _Multiply value for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
    }
    if (isWakamoWhiteDefault) {
      const expectedColors = profileDsfxWakamoEyeWhiteDefault.colors;
      if (Object.keys(colors).length !== Object.keys(expectedColors).length
        || Object.entries(expectedColors).some(([name, expected]) => {
          const actual = colors[name];
          return !actual || !["r", "g", "b", "a"].every(component => Object.prototype.hasOwnProperty.call(actual, component)
            && Number(actual[component]) === expected[component]);
        })) {
        throw new Error(`Profile DSFX AlphaBlend_Add adapter has tampered Wakamo eye color properties.`);
      }
      if ((properties.resolvedTextures ?? []).length !== 0) {
        throw new Error(`Profile DSFX AlphaBlend_Add white-default variant has unexpected resolved source textures.`);
      }
    }
  }
  const resolved = slot.materialProperties?.resolvedTextures?.find(item => item.property === '_Texture');
  if (!isWakamoWhiteDefault && (!resolved?.sourceReference || normalizedProfileReferenceKey(resolved.sourceReference) !== normalizedProfileReferenceKey(texture.textureReference)
    || !Number.isInteger(Number(resolved.width)) || Number(resolved.width) <= 0
    || !Number.isInteger(Number(resolved.height)) || Number(resolved.height) <= 0)) {
    throw new Error(`Profile DSFX static adapter has no exact resolved _Texture evidence for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const unsupported = (slot.materialProperties?.textures ?? []).filter(item => item.name !== '_Texture' && item.texture && String(item.texture.pathId) !== '0');
  if (unsupported.length) throw new Error(`Profile DSFX static adapter has unsupported texture properties for ${slot.sourceMaterialName ?? "(unnamed)"}: ${unsupported.map(item => item.name).join(', ')}.`);
  const inertProperties = assertProfileDsfxShaderExtraction(slot, rule);
  const dynamicError = profileDsfxDynamicEvidence(slot, rule, isWakamoWhiteDefault
    ? new Set([...inertProperties, "_Custom_Data_Offset_Use"])
    : inertProperties);
  if (dynamicError) throw new Error(`Profile DSFX static adapter is dynamic for ${slot.sourceMaterialName ?? "(unnamed)"}: ${dynamicError}.`);
  const state = slot.renderState;
  const blend = state?.blend;
  const isAlphaBlend0 = shaderIdentity === "dsfx/fx_shader_alphablend_0";
  const variant = isAlphaBlend0
    ? profileDsfxAlphaBlend0RenderStateVariants[slot.dsfxRenderStateVariant]
    : isAlphaBlendAdd ? profileDsfxAlphaBlendAddRenderStateVariants[slot.dsfxRenderStateVariant] : null;
  if (isAlphaBlend0 && !variant) {
    throw new Error(`Profile DSFX static adapter has an unknown or missing AlphaBlend_0 render-state variant for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
  if (isAlphaBlendAdd && !variant) {
    throw new Error(`Profile DSFX static adapter has an unknown or missing AlphaBlend_Add render-state variant for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
  if (!isAlphaBlend0 && !isAlphaBlendAdd && slot.dsfxRenderStateVariant !== undefined && slot.dsfxRenderStateVariant !== null) {
    throw new Error(`Profile DSFX static adapter has an unexpected render-state variant for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
  if (state?.alphaMode !== 'BLEND' || state.layer !== 'transparent'
    || (isAdditive && state.sourceQueue !== 3000)
    || (isAlphaBlendAdd && state.sourceQueue !== (isWakamoWhiteDefault ? -1 : 3000))
    || state.depthWrite !== (variant?.depthWrite ?? false) || state.depthTest !== (variant?.depthTest ?? false)
    || state.depthFunction !== (variant?.depthFunction ?? 'disabled') || state.cullMode !== (variant?.cullMode ?? 'off') || state.doubleSided !== (variant?.doubleSided ?? true)
    || state.polygonOffsetFactor !== 0 || state.polygonOffsetUnits !== 0
    || blend?.source !== rule.sourceBlend || blend?.destination !== rule.destinationBlend
    || blend?.sourceAlpha !== rule.sourceBlend || blend?.destinationAlpha !== rule.destinationBlend
    || blend?.operation !== 0 || blend?.operationAlpha !== 0) {
    throw new Error(`Profile DSFX static adapter has an unverified render state for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const tint = slot.adapterSettings?.baseColorTint;
  if (!Array.isArray(tint) || tint.length !== 4 || !tint.every(value => Number.isFinite(Number(value)))) {
    throw new Error(`Profile DSFX static adapter has no exact _Color tint for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const multiply = slot.adapterSettings?.dsfxMultiply;
  if (multiply !== null && multiply !== undefined && !Number.isFinite(Number(multiply))) {
    throw new Error(`Profile DSFX static adapter has an invalid _Multiply value for ${slot.sourceMaterialName ?? "(unnamed)"}.`);
  }
}

function assertDsfxGlitchShaderAdapter(slot) {
  const rule = profileCustomShaderAdapters["dsfx-glitch-tex"];
  const sourceIdentity = normalizedProfileShaderIdentity(slot?.sourceShaderParsedName ?? slot?.sourceShaderName);
  if (sourceIdentity !== rule.identity || String(slot.shaderProgramBlobSha256 ?? '').toLowerCase() !== rule.programBlobSha256
    || normalizedProfileReferenceKey(slot.sourceShaderReference) !== normalizedProfileReferenceKey(rule.sourceReference)) {
    throw new Error(`Profile DSFX Glitch_Tex adapter has an unverified source identity or program version for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const extraction = slot.glitchShaderExtraction;
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
    || extraction.fingerprint !== rule.fingerprint || extraction.compressedBlobSha256 !== rule.programBlobSha256
    || normalizedProfileShaderIdentity(extraction.shaderName) !== rule.identity
    || !exactArray(extraction.shaderKeywordNames, rule.shaderKeywordNames)
    || !exactArray(extraction.requiredProperties, rule.requiredProperties)
    || !exactArray(extraction.requiredTextureProperties, rule.requiredTextureProperties)) {
    throw new Error(`Profile DSFX Glitch_Tex adapter has incomplete source extraction for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const assertPass = (pass, expected, label) => {
    if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.subShaderIndex !== 0
      || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9 || pass.gpuProgramType !== 4
      || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
      || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !exactArray(pass.keywordIndices, []) || !exactArray(pass.keywordNames, [])
      || pass.programHash !== expected.programHash || pass.programDataSha256 !== expected.programHash || pass.programDataLength !== expected.programDataLength
      || pass.programRecordSha256 !== expected.programRecordSha256 || typeof pass.glsl !== 'string'
      || !pass.glsl.includes('#version 300 es') || !pass.glsl.includes('#ifdef VERTEX') || !pass.glsl.includes('#ifdef FRAGMENT')
      || !exactArray(pass.requiredAttributes, expected.requiredAttributes) || !exactArray(pass.requiredUniforms, expected.requiredUniforms)
      || JSON.stringify(pass.renderState) !== JSON.stringify(expected.renderState)) {
      throw new Error(`Profile DSFX Glitch_Tex adapter has incomplete ${label} source pass metadata.`);
    }
    for (const attribute of expected.requiredAttributes) {
      if (!new RegExp(`\\bin\\s+[^;]*\\b${sourceAttributeName(attribute)}\\b`).test(pass.glsl)) {
        throw new Error(`Profile DSFX Glitch_Tex ${label} source is missing ${attribute}.`);
      }
    }
    for (const uniform of expected.requiredUniforms) {
      if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`).test(pass.glsl)) {
        throw new Error(`Profile DSFX Glitch_Tex ${label} source is missing ${uniform}.`);
      }
    }
  };
  assertPass(extraction.passes?.forward, rule.passes.forward, 'Forward');
  assertPass(extraction.passes?.shadow, rule.passes.shadow, 'ShadowCaster');
  const keywords = slot.materialProperties?.keywords;
  if (!exactArray(keywords, [])) throw new Error(`Profile DSFX Glitch_Tex adapter has active shader keywords for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  const floats = slot.materialProperties?.floats ?? {}, expectedFloats = { _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12 };
  if (Object.keys(floats).length !== Object.keys(expectedFloats).length
    || Object.entries(expectedFloats).some(([name, value]) => Number(floats[name]) !== value)
    || Object.keys(slot.materialProperties?.ints ?? {}).length || Object.keys(slot.materialProperties?.colors ?? {}).length) {
    throw new Error(`Profile DSFX Glitch_Tex adapter has an unverified material scalar/color state for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const textures = slot.materialProperties?.textures ?? [];
  if (textures.length !== 2 || !exactArray(textures.map((item) => item.name), rule.requiredTextureProperties)) {
    throw new Error(`Profile DSFX Glitch_Tex adapter has an unverified texture property set for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const main = textures[0], noise = textures[1];
  const materialFile = String(slot.sourceMaterialReference?.serializedFile ?? '').toLowerCase();
  if (!main?.texture || String(main.texture.pathId) !== '0' || String(main.texture.file ?? '').toLowerCase() !== materialFile
    || main.textureReference !== null || Number(main.scale?.x) !== 1 || Number(main.scale?.y) !== 1
    || Number(main.offset?.x) !== 0 || Number(main.offset?.y) !== 0) {
    throw new Error(`Profile DSFX Glitch_Tex adapter has no explicit Unity white _MainTex fallback for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const noiseReference = { bundleSha256: '1454c8ba7cc0b23065122af1ab8892f9490299c10032118abeaa13cad5488b74', serializedFile: 'CAB-39fe55e8868aab69e2cf9a8ae5dcef67', objectId: '277634516359511144' };
  if (!noise?.texture || String(noise.texture.pathId) !== noiseReference.objectId
    || String(noise.texture.file ?? '').toLowerCase() !== noiseReference.serializedFile.toLowerCase()
    || normalizedProfileReferenceKey(noise.textureReference) !== normalizedProfileReferenceKey(noiseReference)
    || Number(noise.scale?.x) !== 1 || Number(noise.scale?.y) !== 1 || Number(noise.offset?.x) !== 0 || Number(noise.offset?.y) !== 0) {
    throw new Error(`Profile DSFX Glitch_Tex adapter has an unverified _NoiseTex identity for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const resolved = slot.materialProperties?.resolvedTextures ?? [];
  if (resolved.length !== 1 || resolved[0]?.property !== '_NoiseTex' || Number(resolved[0]?.width) !== 256 || Number(resolved[0]?.height) !== 256
    || normalizedProfileReferenceKey(resolved[0]?.sourceReference) !== normalizedProfileReferenceKey(noiseReference)) {
    throw new Error(`Profile DSFX Glitch_Tex adapter has incomplete resolved _NoiseTex evidence for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const state = slot.renderState, blend = state?.blend;
  if (!state || state.sourceQueue !== -1 || state.alphaMode !== 'BLEND' || state.layer !== 'transparent' || state.depthWrite !== false
    || state.depthTest !== true || state.depthFunction !== 'less-equal' || state.cullMode !== 'back' || state.doubleSided !== false
    || state.polygonOffsetFactor !== 0 || state.polygonOffsetUnits !== 0 || blend?.source !== 5 || blend?.destination !== 10
    || blend?.sourceAlpha !== 5 || blend?.destinationAlpha !== 10 || blend?.operation !== 0 || blend?.operationAlpha !== 0) {
    throw new Error(`Profile DSFX Glitch_Tex adapter has an unverified transparent source render state for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
}

const profileShaderAdapters = new Set([
  "mx-character-face", "mx-character-eyemouth", "mx-character-eyebrow", "mx-character-hair",
  "mx-character-general", "mx-character-weapon", "gltf-native", "dsfx-static", ...Object.keys(profileCustomShaderAdapters),
]);

function normalizedProfileShaderIdentity(value) {
  return typeof value === "string" ? value.toLowerCase().replaceAll(" ", "").replaceAll("\\", "/") : "";
}

function normalizedProfileReferenceKey(reference) {
  return reference
    ? `${String(reference.bundleSha256).toLowerCase()}:${String(reference.serializedFile).toLowerCase()}:${String(reference.objectId)}`
    : "";
}

function sourceAttributeName(attribute) {
  if (attribute === "POSITION") return "in_POSITION0";
  if (attribute === "NORMAL") return "in_NORMAL0";
  if (attribute === "TEXCOORD_0") return "in_TEXCOORD0";
  if (attribute === "TEXCOORD_1") return "in_TEXCOORD1";
  if (attribute === "TEXCOORD_2") return "in_TEXCOORD2";
  if (attribute === "TANGENT") return "in_TANGENT0";
  if (attribute === "COLOR_0") return "in_COLOR0";
  return `in_${attribute}`;
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function assertOutlineShaderPass(pass, expected, label) {
  if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName
    || pass.subShaderIndex !== 0 || pass.passIndex !== expected.passIndex || pass.stage !== "vertex"
    || pass.platform !== 9 || pass.gpuProgramType !== 4 || pass.blobIndex !== expected.blobIndex
    || pass.parameterBlobIndex !== expected.parameterBlobIndex
    || typeof pass.parameterRecordSha256 !== "string" || !/^[0-9a-f]{64}$/i.test(pass.parameterRecordSha256)
    || !exactArray(pass.keywordIndices, []) || !exactArray(pass.keywordNames, [])
    || pass.programHash !== expected.programHash || pass.programDataSha256 !== expected.programHash
    || typeof pass.programRecordSha256 !== "string"
    || !/^[0-9a-f]{64}$/i.test(pass.programRecordSha256) || typeof pass.glsl !== "string"
    || !exactArray(pass.requiredAttributes, expected.attributes) || !exactArray(pass.requiredUniforms, expected.uniforms)
    || !pass.renderState || pass.renderState.zWrite !== 1 || pass.renderState.zTest !== 4
    || pass.renderState.culling !== expected.culling) {
    throw new Error(`${label} has incomplete or tampered source pass metadata.`);
  }
  if (!pass.glsl.includes("#version 300 es") || !pass.glsl.includes("#ifdef VERTEX") || !pass.glsl.includes("#ifdef FRAGMENT")) {
    throw new Error(`${label} has no complete canonical GLES3 GLSL source.`);
  }
  for (const attribute of expected.attributes) {
    const name = sourceAttributeName(attribute);
    if (!new RegExp(`\\bin\\b[\\s\\S]*?\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`).test(pass.glsl)) {
      throw new Error(`${label} GLSL is missing required ${attribute} input semantics.`);
    }
  }
  for (const uniform of expected.uniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`).test(pass.glsl)) {
      throw new Error(`${label} GLSL is missing required ${uniform} uniform.`);
    }
  }
}

function assertMxUnlitOutlineShaderAdapter(slot) {
  const rule = profileCustomShaderAdapters["mx-unlit-outline"];
  const sourceIdentity = normalizedProfileShaderIdentity(slot?.sourceShaderParsedName ?? slot?.sourceShaderName);
  if (sourceIdentity !== rule.identity
    || String(slot.shaderProgramBlobSha256 ?? "").toLowerCase() !== rule.programBlobSha256
    || normalizedProfileReferenceKey(slot.sourceShaderReference) !== normalizedProfileReferenceKey(rule.sourceReference)) {
    throw new Error(`Profile custom shader adapter mx-unlit-outline has an unverified source identity or program version.`);
  }
  const extraction = slot.shaderExtraction;
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || !/^[0-9a-f]{64}$/i.test(String(extraction.fingerprint ?? ""))
    || String(extraction.compressedBlobSha256 ?? "").toLowerCase() !== rule.programBlobSha256
    || normalizedProfileReferenceKey(extraction.sourceReference) !== normalizedProfileReferenceKey(rule.sourceReference)) {
    throw new Error(`Profile custom shader adapter mx-unlit-outline has no exact source extraction metadata.`);
  }
  assertOutlineShaderPass(extraction.passes?.base, {
    pass: "base", stateName: "ForwardLit", passIndex: 0, blobIndex: 1, parameterBlobIndex: 0, culling: 0,
    programHash: rule.baseProgramHash, attributes: rule.baseAttributes, uniforms: rule.baseUniforms,
  }, "MX/Unlit Outline Forward pass");
  assertOutlineShaderPass(extraction.passes?.outline, {
    pass: "outline", stateName: "Outline", passIndex: 1, blobIndex: 6, parameterBlobIndex: 4, culling: 1,
    programHash: rule.outlineProgramHash, attributes: rule.outlineAttributes, uniforms: rule.outlineUniforms,
  }, "MX/Unlit Outline Outline pass");
  if (extraction.passes.base.programHash === extraction.passes.outline.programHash) {
    throw new Error("MX/Unlit Outline Forward and Outline passes unexpectedly share one program.");
  }
  const tint = slot.adapterSettings?.baseColorTint;
  const outlineTint = slot.adapterSettings?.outlineTint;
  const zCorrection = slot.adapterSettings?.outlineZCorrection;
  if (!Array.isArray(tint) || tint.length !== 4 || !tint.every(value => Number.isFinite(Number(value)))
    || !Array.isArray(outlineTint) || outlineTint.length !== 4 || !outlineTint.every(value => Number.isFinite(Number(value)))
    || !Number.isFinite(Number(zCorrection))) {
    throw new Error("MX/Unlit Outline profile is missing exact material uniforms.");
  }
}

function assertMxCTransparentShaderPass(pass, expected, label) {
  if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.subShaderIndex !== 0
    || pass.passIndex !== expected.passIndex || pass.stage !== "vertex" || pass.platform !== 9
    || pass.gpuProgramType !== 4 || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
    || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !exactArray(pass.keywordIndices, expected.keywordIndices)
    || !exactArray(pass.keywordNames, expected.keywordNames) || pass.programHash !== expected.programHash
    || pass.programDataSha256 !== expected.programHash || pass.programRecordSha256 !== expected.programRecordSha256
    || typeof pass.glsl !== "string" || !exactArray(pass.requiredAttributes, expected.attributes)
    || !exactArray(pass.requiredUniforms, expected.uniforms) || !pass.renderState
    || pass.renderState.zWrite !== 0 || pass.renderState.zWriteProperty !== "_ZWrite"
    || pass.renderState.zTest !== 4 || pass.renderState.culling !== 0 || pass.renderState.cullingProperty !== "_Cull"
    || pass.renderState.sourceBlend !== expected.sourceBlend || pass.renderState.destinationBlend !== expected.destinationBlend
    || pass.renderState.sourceBlendAlpha !== expected.sourceBlendAlpha || pass.renderState.destinationBlendAlpha !== expected.destinationBlendAlpha
    || pass.renderState.blendOperation !== 0 || pass.renderState.blendOperationAlpha !== 0
    || pass.renderState.colorMask !== expected.colorMask || pass.renderState.depthOnly !== expected.depthOnly) {
    throw new Error(`${label} has incomplete or tampered source pass metadata.`);
  }
  if (!pass.glsl.includes("#version 300 es") || !pass.glsl.includes("#ifdef VERTEX") || !pass.glsl.includes("#ifdef FRAGMENT")) {
    throw new Error(`${label} has no complete canonical GLES3 GLSL source.`);
  }
  for (const attribute of expected.attributes) {
    const name = sourceAttributeName(attribute);
    if (!new RegExp(`\\bin\\b[\\s\\S]*?\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}\\b`).test(pass.glsl)) {
      throw new Error(`${label} GLSL is missing required ${attribute} input semantics.`);
    }
  }
  for (const uniform of expected.uniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}\\b`).test(pass.glsl)) {
      throw new Error(`${label} GLSL is missing required ${uniform} uniform.`);
    }
  }
}

function assertMxCTransparentShaderAdapter(slot) {
  const rule = profileCustomShaderAdapters["mx-c-transparent-st"];
  const sourceIdentity = normalizedProfileShaderIdentity(slot?.sourceShaderParsedName ?? slot?.sourceShaderName);
  if (sourceIdentity !== rule.identity
    || String(slot.shaderProgramBlobSha256 ?? "").toLowerCase() !== rule.programBlobSha256
    || normalizedProfileReferenceKey(slot.sourceShaderReference) !== normalizedProfileReferenceKey(rule.sourceReference)) {
    throw new Error("Profile custom shader adapter mx-c-transparent-st has an unverified source identity or program version.");
  }
  const extraction = slot.transparentShaderExtraction;
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || extraction.fingerprint !== rule.fingerprint || extraction.compressedBlobSha256 !== rule.programBlobSha256
    || normalizedProfileReferenceKey(extraction.sourceReference) !== normalizedProfileReferenceKey(rule.sourceReference)) {
    throw new Error("Profile custom shader adapter mx-c-transparent-st has no exact source extraction metadata.");
  }
  const common = { sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 1, destinationBlendAlpha: 10, colorMask: 15, depthOnly: false };
  assertMxCTransparentShaderPass(extraction.passes?.forward, {
    pass: "forward", stateName: "ForwardLit", passIndex: 0, blobIndex: 6,
    parameterBlobIndex: 0, parameterRecordSha256: "b6901e2d32877e7c7d19a77a513f345130a90e9e3c47ff7b22a39bab3af68f65",
    keywordIndices: [], keywordNames: [], programHash: rule.forwardProgramHash,
    programRecordSha256: rule.forwardProgramRecordSha256, attributes: rule.forwardAttributes, uniforms: rule.forwardUniforms, ...common,
  }, "MX/C-Transparent-ST Forward pass");
  assertMxCTransparentShaderPass(extraction.passes?.dither, {
    pass: "dither", stateName: "ForwardLit", passIndex: 0, blobIndex: 8,
    parameterBlobIndex: 1, parameterRecordSha256: "23375befaf4b4f6524e364569fe388024d9df20509258ad4b64b84491eee9a5c",
    keywordIndices: [9], keywordNames: ["_DITHER_HORIZONTAL_LINES"], programHash: rule.ditherProgramHash,
    programRecordSha256: rule.ditherProgramRecordSha256, attributes: rule.forwardAttributes, uniforms: rule.ditherUniforms, ...common,
  }, "MX/C-Transparent-ST Dither pass");
  assertMxCTransparentShaderPass(extraction.passes?.depth, {
    pass: "depth", stateName: "", passIndex: 1, blobIndex: 31,
    parameterBlobIndex: 30, parameterRecordSha256: "d80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532",
    keywordIndices: [], keywordNames: [], programHash: rule.depthProgramHash,
    programRecordSha256: rule.depthProgramRecordSha256, attributes: rule.depthAttributes, uniforms: rule.depthUniforms,
    sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, colorMask: 0, depthOnly: true,
  }, "MX/C-Transparent-ST Depth-only pass");
  const keywords = slot.materialProperties?.keywords;
  if (!exactArray(keywords, []) && !exactArray(keywords, ["_DITHER_HORIZONTAL_LINES"])) {
    throw new Error("MX/C-Transparent-ST profile has unsupported source keywords.");
  }
  const variant = keywords.length ? "dither" : "forward";
  if (slot.adapterSettings?.transparentVariant !== variant) throw new Error("MX/C-Transparent-ST profile has no exact source keyword variant.");
  const numericNames = ["_Cull", "_ZWrite", "_MaskGSensitivity", "_MaskRtoG", "_SeeThroughMinValue", "_SeeThroughTransparency", "_SeeThroughSmoothness", "_ShadowThreshold", "_RimAreaMultiplier", "_RimStrength", "_AdditionalLightStrength", "_AdditionalLightSharpness", "_DitherThreshold", "_GrayBrightness"];
  if (numericNames.some(name => !Number.isFinite(Number(slot.materialProperties?.floats?.[name])))) throw new Error("MX/C-Transparent-ST profile is missing exact source scalar values.");
  const colorNames = ["_Tint", "_ShadowTint", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor"];
  if (colorNames.some(name => !Array.isArray(slot.materialProperties?.colors?.[name]) && !slot.materialProperties?.colors?.[name])) throw new Error("MX/C-Transparent-ST profile is missing exact source color values.");
  for (const property of ["_MainTex", "_MaskTex"]) {
    const texture = slot.materialProperties?.textures?.find(item => item.name === property);
    const resolved = slot.materialProperties?.resolvedTextures?.find(item => item.property === property);
    if (!texture?.texture || String(texture.texture.pathId) === "0" || !texture.textureReference
      || String(texture.texture.file).toLowerCase() !== String(texture.textureReference.serializedFile).toLowerCase()
      || String(texture.texture.pathId) !== String(texture.textureReference.objectId)
      || !resolved?.sourceReference || normalizedProfileReferenceKey(resolved.sourceReference) !== normalizedProfileReferenceKey(texture.textureReference)
      || !Number.isInteger(Number(resolved.width)) || Number(resolved.width) <= 0
      || !Number.isInteger(Number(resolved.height)) || Number(resolved.height) <= 0) {
      throw new Error(`MX/C-Transparent-ST profile has no exact ${property} identity.`);
    }
  }
  const state = slot.renderState, blend = state?.blend;
  if (state?.alphaMode !== "BLEND" || state.layer !== "transparent" || state.depthTest !== true || state.cullMode !== "off"
    || state.doubleSided !== true || blend?.source !== 5 || blend.destination !== 10 || blend.sourceAlpha !== 1
    || blend.destinationAlpha !== 10 || blend.operation !== 0 || blend.operationAlpha !== 0) {
    throw new Error("MX/C-Transparent-ST profile has an unverified source render state.");
  }
}

function assertProjectMxShaderPass(pass, expected, declarations, label) {
  if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName
    || pass.subShaderIndex !== 0 || pass.passIndex !== expected.passIndex || pass.stage !== "vertex"
    || pass.platform !== 9 || pass.gpuProgramType !== 4 || pass.blobIndex !== expected.blobIndex
    || pass.parameterBlobIndex !== expected.parameterBlobIndex || pass.parameterRecordSha256 !== expected.parameterRecordSha256
    || !exactArray(pass.keywordIndices, expected.keywordIndices) || !exactArray(pass.keywordNames, expected.keywordNames)
    || pass.programHash !== expected.programHash || pass.programDataSha256 !== expected.programHash
    || pass.programRecordSha256 !== expected.programRecordSha256 || pass.programDataLength !== expected.programDataLength
    || pass.usesNoiseTexture !== expected.usesNoiseTexture || typeof pass.glsl !== "string"
    || !exactArray(pass.requiredAttributes, declarations.attributes) || !exactArray(pass.requiredUniforms, declarations.uniforms)
    || !pass.renderState || pass.renderState.zWrite !== expected.renderState.zWrite
    || pass.renderState.zTest !== expected.renderState.zTest || pass.renderState.culling !== expected.renderState.culling
    || pass.renderState.colorMask !== expected.renderState.colorMask
    || pass.renderState.sourceBlend !== expected.renderState.sourceBlend
    || pass.renderState.destinationBlend !== expected.renderState.destinationBlend
    || pass.renderState.sourceBlendAlpha !== expected.renderState.sourceBlendAlpha
    || pass.renderState.destinationBlendAlpha !== expected.renderState.destinationBlendAlpha
    || pass.renderState.blendOperation !== expected.renderState.blendOperation
    || pass.renderState.blendOperationAlpha !== expected.renderState.blendOperationAlpha
    || pass.renderState.depthOnly !== expected.renderState.depthOnly) {
    throw new Error(`${label} has incomplete or tampered source pass metadata.`);
  }
  if (!pass.glsl.includes("#version 300 es") || !pass.glsl.includes("#ifdef VERTEX") || !pass.glsl.includes("#ifdef FRAGMENT")) {
    throw new Error(`${label} has no complete canonical GLES3 GLSL source.`);
  }
  for (const attribute of declarations.attributes) {
    const name = sourceAttributeName(attribute);
    if (!new RegExp(`\\bin\\b[\\s\\S]*?\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}\\b`).test(pass.glsl)) {
      throw new Error(`${label} GLSL is missing required ${attribute} input semantics.`);
    }
  }
  for (const uniform of declarations.uniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}\\b`).test(pass.glsl)) {
      throw new Error(`${label} GLSL is missing required ${uniform} uniform.`);
    }
  }
}

function assertProjectMxSourceTexture(slot, property, required) {
  const texture = slot.materialProperties?.textures?.find((item) => item.name === property);
  const resolved = slot.materialProperties?.resolvedTextures?.find((item) => item.property === property);
  if (!required && (!texture?.texture || String(texture.texture.pathId) === "0")) return null;
  if (!texture?.texture || String(texture.texture.pathId) === "0" || !texture.textureReference
    || String(texture.texture.file).toLowerCase() !== String(texture.textureReference.serializedFile).toLowerCase()
    || String(texture.texture.pathId) !== String(texture.textureReference.objectId)
    || !resolved?.sourceReference || normalizedProfileReferenceKey(resolved.sourceReference) !== normalizedProfileReferenceKey(texture.textureReference)
    || !Number.isInteger(Number(resolved.width)) || Number(resolved.width) <= 0
    || !Number.isInteger(Number(resolved.height)) || Number(resolved.height) <= 0) {
    throw new Error(`ProjectMX/WeaponTest1Damage profile has no exact ${property} identity.`);
  }
  return texture;
}

function assertProjectMxShaderAdapter(slot) {
  const rule = profileCustomShaderAdapters["projectmx-weapon-test1-damage"];
  const sourceIdentity = normalizedProfileShaderIdentity(slot?.sourceShaderParsedName ?? slot?.sourceShaderName);
  if (sourceIdentity !== rule.identity
    || String(slot.shaderProgramBlobSha256 ?? "").toLowerCase() !== rule.programBlobSha256
    || normalizedProfileReferenceKey(slot.sourceShaderReference) !== normalizedProfileReferenceKey(rule.sourceReference)) {
    throw new Error("Profile custom shader adapter projectmx-weapon-test1-damage has an unverified source identity or program version.");
  }
  const extraction = slot.projectMxShaderExtraction;
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || extraction.unityVersion !== "2021.3" || extraction.fingerprint !== rule.fingerprint
    || extraction.compressedBlobSha256 !== rule.programBlobSha256
    || normalizedProfileReferenceKey(extraction.sourceReference) !== normalizedProfileReferenceKey(rule.sourceReference)
    || extraction.shaderName !== rule.shaderName || !exactArray(extraction.shaderKeywordNames, rule.shaderKeywordNames)
    || !exactArray(extraction.requiredProperties, rule.requiredProperties)
    || !exactArray(extraction.requiredTextureProperties, rule.requiredTextureProperties)) {
    throw new Error("Profile custom shader adapter projectmx-weapon-test1-damage has no exact source extraction metadata.");
  }
  const keywords = slot.materialProperties?.keywords;
  const variant = exactArray(keywords, []) ? "forward" : exactArray(keywords, ["_GLOW_0"]) ? "glow" : null;
  if (!variant || extraction.activeVariant !== variant
    || !exactArray(extraction.activeKeywordNames, variant === "glow" ? ["_GLOW_0"] : [])) {
    throw new Error("ProjectMX/WeaponTest1Damage profile has unsupported active source keywords.");
  }
  for (const [passName, expected] of Object.entries(rule.passes)) {
    assertProjectMxShaderPass(extraction.passes?.[passName], expected, projectMxPassDeclarations[passName], `ProjectMX/WeaponTest1Damage ${passName} pass`);
  }
  const activePass = extraction.passes[variant];
  if (activePass.usesNoiseTexture !== false) throw new Error("ProjectMX/WeaponTest1Damage active variant unexpectedly consumes _NoiseTex.");
  assertProjectMxSourceTexture(slot, "_mainTex", true);
  assertProjectMxSourceTexture(slot, "_sourceTex", true);
  // `_NoiseTex` may be serialized on a source material even when the
  // selected static forward/glow pass never binds it.  Validate that any
  // serialized pointer is exact source evidence, but keep it separate from
  // active runtime texture bindings (which are exported only when consumed).
  const serializedNoiseTexture = assertProjectMxSourceTexture(slot, "_NoiseTex", activePass.usesNoiseTexture === true);
  const properties = slot.materialProperties ?? {};
  const colorValues = (name) => colorArray(properties.colors?.[name]);
  for (const name of ["_Color", "_OutlineTint", "_OutlineSolidColorTint"]) {
    if (!colorValues(name)) throw new Error(`ProjectMX/WeaponTest1Damage profile is missing exact ${name} tint.`);
  }
  const numericValue = (name) => Number(properties.floats?.[name] ?? properties.ints?.[name]);
  for (const name of ["_DamageON", "_Damage", "_Fire", "_IsDither"]) {
    if (!Number.isFinite(numericValue(name)) || numericValue(name) !== 0) throw new Error(`ProjectMX/WeaponTest1Damage profile enables unsupported interactive ${name} behavior.`);
  }
  const expectedUseGlow = variant === "glow" ? 1 : 0;
  if (!Number.isFinite(numericValue("_UseGlow")) || numericValue("_UseGlow") !== expectedUseGlow) {
    throw new Error(`ProjectMX/WeaponTest1Damage profile has an unverified _UseGlow variant gate.`);
  }
  if (variant === "glow") {
    for (const name of ["_GlowMaskColor0", "_GlowTint0"]) {
      if (!colorValues(name)) throw new Error(`ProjectMX/WeaponTest1Damage profile is missing exact ${name} glow tint.`);
    }
    for (const name of ["_GlowStrictness0", "_GlowStrength0"]) {
      if (!Number.isFinite(numericValue(name))) throw new Error(`ProjectMX/WeaponTest1Damage profile is missing exact ${name} glow value.`);
    }
  }
  const state = slot.renderState, blend = state?.blend;
  if (state?.alphaMode !== "OPAQUE" || state.layer !== "opaque" || state.depthWrite !== true || state.depthTest !== true
    || state.depthFunction !== "less-equal" || state.cullMode !== "back" || state.doubleSided !== false
    || blend?.source !== 1 || blend.destination !== 0 || blend.sourceAlpha !== 1 || blend.destinationAlpha !== 0
    || blend.operation !== 0 || blend.operationAlpha !== 0) {
    throw new Error("ProjectMX/WeaponTest1Damage profile has an unverified opaque depth/cull state.");
  }
  void serializedNoiseTexture;
  const binding = slot.glb;
  if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
    || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) {
    throw new Error("ProjectMX/WeaponTest1Damage profile has no exact GLB primitive binding.");
  }
  for (const primitiveIndex of binding.primitiveIndices) {
    const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex];
    if (!primitive) throw new Error(`ProjectMX/WeaponTest1Damage primitive ${primitiveIndex} is missing.`);
    for (const [semantic, type] of [["POSITION", "VEC3"], ["NORMAL", "VEC3"], ["TEXCOORD_0", "VEC2"], ["TANGENT", "VEC4"], ["COLOR_0", "VEC4"]]) {
      const accessorIndex = primitive.attributes?.[semantic];
      const accessor = json.accessors?.[accessorIndex];
      if (!Number.isInteger(accessorIndex) || !accessor || accessor.componentType !== 5126 || accessor.type !== type) {
        throw new Error(`ProjectMX/WeaponTest1Damage primitive ${primitiveIndex} does not preserve ${semantic} source data.`);
      }
    }
  }
}

function assertEStandardShaderPass(pass, expected, label) {
  const state = pass?.renderState;
  const expectedState = ["forwardStatic", "forwardDynamic"].includes(expected.pass)
    ? { zWrite: 0, zWriteProperty: "_ZWrite", zTest: 4, zTestProperty: "<noninit>", culling: 0, cullingProperty: "_Cull", sourceBlend: 0, sourceBlendProperty: "_SrcBlend", destinationBlend: 0, destinationBlendProperty: "_DstBlend", sourceBlendAlpha: 0, sourceBlendAlphaProperty: "_SrcBlendAlpha", destinationBlendAlpha: 0, destinationBlendAlphaProperty: "_DstBlendAlpha", colorMask: 15, depthOnly: false, offsetFactor: 0, offsetFactorProperty: "_ZOffsetFactor", offsetUnits: 0, offsetUnitsProperty: "_ZOffsetUnits" }
    : { zWrite: 1, zWriteProperty: "<noninit>", zTest: 4, zTestProperty: "<noninit>", culling: 0, cullingProperty: expected.stateName === "Meta" ? "<noninit>" : "_Cull", sourceBlend: 1, sourceBlendProperty: "<noninit>", destinationBlend: 0, destinationBlendProperty: "<noninit>", sourceBlendAlpha: 1, sourceBlendAlphaProperty: "<noninit>", destinationBlendAlpha: 0, destinationBlendAlphaProperty: "<noninit>", colorMask: expected.pass === "depth" ? 0 : 15, depthOnly: expected.pass === "depth", offsetFactor: 0, offsetFactorProperty: "<noninit>", offsetUnits: 0, offsetUnitsProperty: "<noninit>" };
  if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.passName !== ""
    || pass.subShaderIndex !== 0 || pass.passIndex !== expected.passIndex || pass.stage !== "vertex" || pass.platform !== 9
    || pass.gpuProgramType !== 4 || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
    || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !exactArray(pass.keywordIndices, expected.keywordIndices)
    || !exactArray(pass.keywordNames, expected.keywordNames) || pass.programHash !== expected.programHash
    || pass.programDataSha256 !== expected.programHash || pass.programRecordSha256 !== expected.programRecordSha256
    || pass.programDataLength !== expected.programDataLength || typeof pass.glsl !== "string"
    || !exactArray(pass.requiredAttributes, expected.attributes) || !exactArray(pass.requiredUniforms, expected.uniforms)
    || !state || Object.entries(expectedState).some(([key, value]) => state[key] !== value)) {
    throw new Error(`${label} has incomplete or tampered source pass metadata.`);
  }
  if (!pass.glsl.includes("#version 300 es") || !pass.glsl.includes("#ifdef VERTEX") || !pass.glsl.includes("#ifdef FRAGMENT")) {
    throw new Error(`${label} has no complete canonical GLES3 GLSL source.`);
  }
  for (const attribute of expected.attributes) {
    const name = sourceAttributeName(attribute);
    if (!new RegExp(`\\bin\\b[\\s\\S]*?\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}\\b`).test(pass.glsl)) throw new Error(`${label} GLSL is missing required ${attribute} input semantics.`);
  }
  for (const uniform of expected.uniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}\\b`).test(pass.glsl)) throw new Error(`${label} GLSL is missing required ${uniform} uniform.`);
  }
}

function assertEStandardSourceTexture(slot, property, required) {
  const texture = slot.materialProperties?.textures?.find((item) => item.name === property);
  if (!texture) throw new Error(`MX/E-Standard profile is missing ${property} source texture metadata.`);
  if (!required) {
    if (texture.texture && String(texture.texture.pathId) !== "0") throw new Error(`MX/E-Standard profile binds unsupported ${property}.`);
    if (texture.textureReference) throw new Error(`MX/E-Standard profile has an unexpected inactive ${property} source identity.`);
    return null;
  }
  const resolved = slot.materialProperties?.resolvedTextures?.find((item) => item.property === property);
  if (!texture.texture || String(texture.texture.pathId) === "0" || !texture.textureReference
    || String(texture.texture.file).toLowerCase() !== String(texture.textureReference.serializedFile).toLowerCase()
    || String(texture.texture.pathId) !== String(texture.textureReference.objectId)
    || !resolved?.sourceReference || normalizedProfileReferenceKey(resolved.sourceReference) !== normalizedProfileReferenceKey(texture.textureReference)
    || !Number.isInteger(Number(resolved.width)) || Number(resolved.width) <= 0
    || !Number.isInteger(Number(resolved.height)) || Number(resolved.height) <= 0) {
    throw new Error(`MX/E-Standard profile has no exact ${property} source identity.`);
  }
  return texture;
}

function assertEStandardShaderAdapter(slot) {
  const rule = profileCustomShaderAdapters["mx-e-standard"];
  const sourceIdentity = normalizedProfileShaderIdentity(slot?.sourceShaderParsedName ?? slot?.sourceShaderName);
  if (sourceIdentity !== rule.identity || String(slot.shaderProgramBlobSha256 ?? "").toLowerCase() !== rule.programBlobSha256
    || normalizedProfileReferenceKey(slot.sourceShaderReference) !== normalizedProfileReferenceKey(rule.sourceReference)) {
    throw new Error("Profile custom shader adapter mx-e-standard has an unverified source identity or program version.");
  }
  const extraction = slot.eStandardShaderExtraction;
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== "2021.3"
    || extraction.fingerprint !== rule.fingerprint || extraction.compressedBlobSha256 !== rule.programBlobSha256
    || normalizedProfileReferenceKey(extraction.sourceReference) !== normalizedProfileReferenceKey(rule.sourceReference)
    || extraction.shaderName !== rule.shaderName || !exactArray(extraction.shaderKeywordNames, rule.shaderKeywordNames)
    || !exactArray(extraction.requiredProperties, rule.requiredProperties)
    || !exactArray(extraction.sourceTextureProperties, rule.sourceTextureProperties)
    || !exactArray(extraction.requiredTextureProperties, rule.requiredTextureProperties)) {
    throw new Error("Profile custom shader adapter mx-e-standard has no exact source extraction metadata.");
  }
  const keywords = slot.materialProperties?.keywords;
  const variant = exactArray(keywords, ["_DYNAMIC_LIGHTS", "_SPECULAR_SETUP"]) || exactArray(keywords, ["_DYNAMIC_LIGHTS"]) ? "dynamic"
    : exactArray(keywords, ["_SPECULAR_SETUP"]) ? "static" : null;
  if (!variant || extraction.activeVariant !== variant || !exactArray(extraction.activeKeywordNames, variant === "dynamic" ? ["_DYNAMIC_LIGHTS"] : [])) {
    throw new Error("MX/E-Standard profile has unsupported active source keywords.");
  }
  for (const [passName, expected] of Object.entries(rule.passes)) {
    assertEStandardShaderPass(extraction.passes?.[passName], expected, `MX/E-Standard ${passName} pass`);
  }
  if (extraction.passes.forward?.programHash !== extraction.passes[variant === "dynamic" ? "forwardDynamic" : "forwardStatic"]?.programHash) {
    throw new Error("MX/E-Standard profile active ForwardLit source pass is inconsistent.");
  }
  if (!Array.isArray(slot.materialProperties?.textures) || slot.materialProperties.textures.length !== rule.sourceTextureProperties.length
    || slot.materialProperties.textures.some((item) => !rule.sourceTextureProperties.includes(item.name))) {
    throw new Error("MX/E-Standard profile has an unverified source texture property set.");
  }
  const mainTexture = assertEStandardSourceTexture(slot, "_MainTex", true);
  for (const property of ["_PrefabLightmapTex", "_ReflectTex", "_EmissionTex", "_SpecTex"]) assertEStandardSourceTexture(slot, property, false);
  const properties = slot.materialProperties ?? {};
  const numericValue = (name) => Number(properties.floats?.[name] ?? properties.ints?.[name]);
  for (const name of ["_Cutoff", "_SrcBlend", "_DstBlend", "_SrcBlendAlpha", "_DstBlendAlpha", "_ZWrite", "_Cull", "_ZOffsetFactor", "_ZOffsetUnits", "_ReflectBaseAmount", "_ReflectAnglePower", "_ShadowAttenRefl", "_ReflectStrength", "_EmissionStrength", "_SpecPower", "_ShadowAttenSpec", "_LightmapStrength"]) {
    if (!Number.isFinite(numericValue(name))) throw new Error(`MX/E-Standard profile is missing exact source scalar ${name}.`);
  }
  for (const name of ["_Color", "_SpecLightDir", "_SpecLightColor", "_CodeAddColor", "_CodeMultiplyColor", "_CodeAddRimColor"]) {
    const color = colorArray(properties.colors?.[name]);
    if (!color) throw new Error(`MX/E-Standard profile is missing exact source color ${name}.`);
  }
  const tint = slot.adapterSettings?.baseColorTint;
  if (!Array.isArray(tint) || tint.length !== 4 || !tint.every((value) => Number.isFinite(Number(value)))) throw new Error("MX/E-Standard profile is missing exact _Color tint.");
  const state = slot.renderState, blend = state?.blend;
  if (state?.alphaMode !== "OPAQUE" || state.layer !== "opaque" || state.depthWrite !== true || state.depthTest !== true
    || state.depthFunction !== "less-equal" || state.cullMode !== "back" || state.doubleSided !== false
    || state.polygonOffsetFactor !== 0 || state.polygonOffsetUnits !== 0 || blend?.source !== 1 || blend.destination !== 0
    || blend.sourceAlpha !== 1 || blend.destinationAlpha !== 0 || blend.operation !== 0 || blend.operationAlpha !== 0) {
    throw new Error("MX/E-Standard profile has an unverified opaque source render state.");
  }
  const binding = slot.glb;
  if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
    || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) throw new Error("MX/E-Standard profile has no exact GLB primitive binding.");
  for (const [index, primitiveIndex] of binding.primitiveIndices.entries()) {
    const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex];
    const materialIndex = binding.materialIndices[index];
    if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex) throw new Error("MX/E-Standard profile lost its exact GLB material binding.");
    for (const [semantic, type] of [["POSITION", "VEC3"], ["NORMAL", "VEC3"], ["TEXCOORD_0", "VEC2"]]) {
      const accessorIndex = primitive.attributes?.[semantic];
      const accessor = json.accessors?.[accessorIndex];
      if (!Number.isInteger(accessorIndex) || !accessor || accessor.componentType !== 5126 || accessor.type !== type) throw new Error(`MX/E-Standard primitive ${primitiveIndex} does not preserve ${semantic} source data.`);
    }
  }
  void mainTexture;
}

// CH0191_FoodProp_02 serializes these URP-era fields even though the linked
// DSFX Matcap shader neither declares nor references them. Keep their values
// exact: this is a material-specific residue allowlist, not a generic escape
// hatch for unknown properties.
const profileDsfxMatcapInertFloatProperties = Object.freeze({
  _AlphaClip: 0,
  _Blend: 0,
  _BumpScale: 1,
  _Cull: 2,
  _Cutoff: 0.527999997138977,
  _DstBlend: 10,
  _EnvironmentReflections: 0,
  _GlossMapScale: 0,
  _Glossiness: 0,
  _GlossinessSource: 0,
  _GlossyReflections: 0,
  _Metallic: 0.08699999749660492,
  _OcclusionStrength: 1,
  _QueueOffset: -50,
  _ReceiveShadows: 0,
  _SampleGI: 0,
  _Shininess: 0,
  _Smoothness: 0.032999999821186066,
  _SmoothnessSource: 0,
  _SmoothnessTextureChannel: 0,
  _SpecSource: 0,
  _SpecularHighlights: 0,
  _SrcBlend: 5,
  _Surface: 1,
  _WorkflowMode: 1,
  _ZWrite: 0,
});
const profileDsfxMatcapInertColorProperties = Object.freeze({
  _BaseColor: { r: 1, g: 1, b: 1, a: 1 },
  _Color: { r: 1, g: 1, b: 1, a: 1 },
  _EmissionColor: { r: 0, g: 0, b: 0, a: 1 },
  _SpecColor: { r: 0.5849056243896484, g: 0.5849056243896484, b: 0.5849056243896484, a: 0.032999999821186066 },
});
const profileDsfxMatcapInertProperties = new Set([
  ...Object.keys(profileDsfxMatcapInertFloatProperties), ...Object.keys(profileDsfxMatcapInertColorProperties),
]);

function assertDsfxMatcapShaderAdapter(slot) {
  const rule = profileCustomShaderAdapters["dsfx-matcap"];
  const sourceIdentity = normalizedProfileShaderIdentity(slot?.sourceShaderParsedName ?? slot?.sourceShaderName);
  if (sourceIdentity !== rule.identity
    || String(slot.shaderProgramBlobSha256 ?? "").toLowerCase() !== rule.programBlobSha256
    || normalizedProfileReferenceKey(slot.sourceShaderReference) !== normalizedProfileReferenceKey(rule.sourceReference)
    || normalizedProfileReferenceKey(slot.sourceMaterialReference) !== "d595ec49e21a44b8a9d1fb280f5e9ea00fedcda560ffc242e792b4fcd175d748:cab-ea179b2d4143f9bef81bc7cac07dcd93:-5136731906767245831") {
    throw new Error(`Profile DSFX Matcap adapter has an unverified source identity or program version for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const extraction = slot.matcapShaderExtraction;
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || extraction.unityVersion !== "2021.3" || extraction.fingerprint !== rule.fingerprint
    || extraction.compressedBlobSha256 !== rule.programBlobSha256
    || extraction.shaderName !== rule.shaderName
    || normalizedProfileReferenceKey(extraction.sourceReference) !== normalizedProfileReferenceKey(rule.sourceReference)
    || !exactArray(extraction.shaderKeywordNames, rule.shaderKeywordNames)
    || !exactArray(extraction.requiredProperties, rule.requiredProperties)
    || !exactArray(extraction.requiredTextureProperties, rule.requiredTextureProperties)) {
    throw new Error(`Profile DSFX Matcap adapter has no exact source extraction metadata for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const assertPass = (pass, expected, label) => {
    if (!pass || pass.pass !== expected.pass || pass.variant !== expected.variant || pass.stateName !== expected.stateName
      || pass.subShaderIndex !== 0 || pass.passIndex !== expected.passIndex || pass.stage !== "vertex"
      || pass.platform !== 9 || pass.gpuProgramType !== 4 || pass.blobIndex !== expected.blobIndex
      || pass.parameterBlobIndex !== expected.parameterBlobIndex || pass.parameterRecordSha256 !== expected.parameterRecordSha256
      || !exactArray(pass.keywordIndices, expected.keywordIndices) || !exactArray(pass.keywordNames, expected.keywordNames)
      || pass.programHash !== expected.programHash || pass.programDataSha256 !== expected.programHash
      || pass.programRecordSha256 !== expected.programRecordSha256 || pass.programDataLength !== expected.programDataLength
      || typeof pass.glsl !== "string" || !pass.glsl.includes("#version 300 es")
      || !pass.glsl.includes("#ifdef VERTEX") || !pass.glsl.includes("#ifdef FRAGMENT")
      || !exactArray(pass.requiredAttributes, expected.requiredAttributes)
      || !exactArray(pass.requiredUniforms, expected.requiredUniforms)
      || JSON.stringify(pass.renderState) !== JSON.stringify(expected.renderState)) {
      throw new Error(`Profile DSFX Matcap adapter has incomplete or tampered ${label} source pass metadata.`);
    }
    for (const attribute of expected.requiredAttributes) {
      const sourceName = sourceAttributeName(attribute);
      if (!new RegExp(`\\bin\\s+[^;]*\\b${sourceName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`).test(pass.glsl)) {
        throw new Error(`Profile DSFX Matcap ${label} GLSL is missing required ${attribute} input semantics.`);
      }
    }
    for (const uniform of expected.requiredUniforms) {
      if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`).test(pass.glsl)) {
        throw new Error(`Profile DSFX Matcap ${label} GLSL is missing required ${uniform} uniform.`);
      }
    }
  };
  for (const [name, expected] of Object.entries(rule.passes)) assertPass(extraction.passes?.[name], expected, `${name} pass`);

  const glsl = Object.values(extraction.passes ?? {}).map((pass) => pass?.glsl ?? '').join('\n');
  for (const inert of profileDsfxMatcapInertProperties) {
    if (profileDsfxGlslIdentifier(glsl, inert)) {
      throw new Error(`Profile DSFX Matcap GLSL declares or consumes inert property ${inert} for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
    }
  }

  if (!exactArray(slot.materialProperties?.keywords, [])) {
    throw new Error(`Profile DSFX Matcap adapter has active source shader keywords for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const expectedFloats = { ...profileDsfxMatcapInertFloatProperties, _ZWrite_Mode: 1, _Cull_Mode: 2 };
  const floats = slot.materialProperties?.floats ?? {};
  const exactNumber = (actual, expected) => (typeof actual === 'number' || typeof actual === 'string') && Number(actual) === expected;
  if (Object.keys(floats).length !== Object.keys(expectedFloats).length
    || Object.entries(expectedFloats).some(([name, value]) => !exactNumber(floats[name], value))
    || Object.keys(slot.materialProperties?.ints ?? {}).length) {
    throw new Error(`Profile DSFX Matcap adapter has an unverified source scalar/color state for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const expectedColors = {
    ...profileDsfxMatcapInertColorProperties,
    _Main_Color: { r: 0.30188679695129395, g: 0.055614907294511795, b: 0, a: 0.772549033164978 },
  };
  const colors = slot.materialProperties?.colors ?? {};
  const exactColor = (actual, expected) => actual && typeof actual === 'object'
    && ['r', 'g', 'b', 'a'].every((component) => Object.prototype.hasOwnProperty.call(actual, component)
      && exactNumber(actual[component], expected[component]));
  if (Object.keys(colors).length !== Object.keys(expectedColors).length
    || Object.keys(colors).some((name) => !Object.prototype.hasOwnProperty.call(expectedColors, name))
    || Object.entries(expectedColors).some(([name, value]) => !exactColor(colors[name], value))) {
    throw new Error(`Profile DSFX Matcap adapter has an unverified source scalar/color state for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const color = colorArray(slot.materialProperties?.colors?._Main_Color);
  const expectedColor = [0.30188679695129395, 0.055614907294511795, 0, 0.772549033164978];
  if (!color || !exactArray(color, expectedColor)) {
    throw new Error(`Profile DSFX Matcap adapter has an unverified _Main_Color value for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const numeric = (name) => Number(slot.materialProperties?.floats?.[name] ?? slot.materialProperties?.ints?.[name]);
  if (numeric("_ZWrite_Mode") !== 1 || numeric("_Cull_Mode") !== 2) {
    throw new Error(`Profile DSFX Matcap adapter has an unverified source render-state property for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }

  const textures = slot.materialProperties?.textures ?? [];
  if (textures.length !== 3 || !exactArray(textures.map((item) => item.name), ["_Main_Tex", "_Matcap_Tex", "_texcoord"])) {
    throw new Error(`Profile DSFX Matcap adapter has an unverified source texture property set for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const expectedTextures = {
    _Main_Tex: { bundleSha256: "c0902532467f62315531c05d9e7047e6265b5021ac982cf06cdd87ecb2ffd4b4", serializedFile: "CAB-22cae0b66f2ef2c9cc2627354aa6e59d", objectId: "-1931283808872943791" },
    _Matcap_Tex: { bundleSha256: "1e293d91261dd2af2b91657dfe0e2e0512c48e246ac43ac90d99159975f5b1a7", serializedFile: "CAB-7405438e0c71de1c2ead1707d796c2fc", objectId: "3221402221456861287" },
  };
  for (const property of ["_Main_Tex", "_Matcap_Tex"]) {
    const texture = textures.find((item) => item.name === property), expectedTexture = expectedTextures[property];
    if (!texture?.texture || String(texture.texture.pathId) === "0" || !texture.textureReference
      || String(texture.texture.file ?? "").toLowerCase() !== expectedTexture.serializedFile.toLowerCase()
      || String(texture.texture.pathId) !== expectedTexture.objectId
      || normalizedProfileReferenceKey(texture.textureReference) !== normalizedProfileReferenceKey(expectedTexture)
      || Number(texture.scale?.x) !== 1 || Number(texture.scale?.y) !== 1
      || Number(texture.offset?.x) !== 0 || Number(texture.offset?.y) !== 0) {
      throw new Error(`Profile DSFX Matcap adapter has an unverified ${property} source identity for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
    }
  }
  const texcoord = textures.find((item) => item.name === "_texcoord");
  if (!texcoord?.texture || String(texcoord.texture.pathId) !== "0" || texcoord.textureReference !== null) {
    throw new Error(`Profile DSFX Matcap adapter has an unverified _texcoord default binding for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const resolved = slot.materialProperties?.resolvedTextures ?? [];
  if (resolved.length !== 2 || !exactArray(resolved.map((item) => item.property), ["_Main_Tex", "_Matcap_Tex"])
    || resolved.some((item) => Number(item.width) !== 64 || Number(item.height) !== 64)) {
    throw new Error(`Profile DSFX Matcap adapter has incomplete resolved texture evidence for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  for (const property of ["_Main_Tex", "_Matcap_Tex"]) {
    const source = textures.find((item) => item.name === property);
    const resolvedTexture = resolved.find((item) => item.property === property);
    if (normalizedProfileReferenceKey(resolvedTexture?.sourceReference) !== normalizedProfileReferenceKey(expectedTextures[property])
      || normalizedProfileReferenceKey(source?.textureReference) !== normalizedProfileReferenceKey(expectedTextures[property])) {
      throw new Error(`Profile DSFX Matcap adapter has an inconsistent resolved ${property} identity for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
    }
  }
  const state = slot.renderState, blend = state?.blend;
  if (!state || state.sourceQueue !== -1 || state.alphaMode !== "BLEND" || state.layer !== "transparent"
    || state.depthWrite !== true || state.depthTest !== true || state.depthFunction !== "less-equal"
    || state.cullMode !== "back" || state.doubleSided !== false || state.polygonOffsetFactor !== 0
    || state.polygonOffsetUnits !== 0 || blend?.source !== 5 || blend.destination !== 10
    || blend.sourceAlpha !== 5 || blend.destinationAlpha !== 10 || blend.operation !== 0 || blend.operationAlpha !== 0) {
    throw new Error(`Profile DSFX Matcap adapter has an unverified transparent source render state for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  const binding = slot.glb;
  if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
    || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) {
    throw new Error(`Profile DSFX Matcap adapter has no exact GLB primitive binding for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
  }
  for (const [index, primitiveIndex] of binding.primitiveIndices.entries()) {
    const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex], materialIndex = binding.materialIndices[index];
    if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex) {
      throw new Error(`Profile DSFX Matcap adapter lost its exact GLB material binding for ${slot?.sourceMaterialName ?? "(unnamed)"}.`);
    }
    for (const [semantic, type] of [["POSITION", "VEC3"], ["NORMAL", "VEC3"], ["TEXCOORD_0", "VEC2"], ["COLOR_0", "VEC4"]]) {
      const accessorIndex = primitive.attributes?.[semantic], accessor = json.accessors?.[accessorIndex];
      if (!Number.isInteger(accessorIndex) || !accessor || accessor.componentType !== 5126 || accessor.type !== type) {
        throw new Error(`Profile DSFX Matcap adapter primitive ${primitiveIndex} does not preserve ${semantic} source data.`);
      }
    }
  }
}

function assertProfileShaderAdapter(slot) {
  if (!slot || typeof slot.adapterId !== "string" || !profileShaderAdapters.has(slot.adapterId)) {
    throw new Error(`Profile material ${slot?.sourceMaterialName ?? "(unnamed)"} has no supported verified shader adapter.`);
  }
  if (slot.adapterId === 'dsfx-static') {
    assertDsfxStaticShaderAdapter(slot);
    return;
  }
  if (slot.adapterId === 'dsfx-glitch-tex') {
    assertDsfxGlitchShaderAdapter(slot);
    return;
  }
  if (slot.adapterId === 'mx-unlit-outline') {
    assertMxUnlitOutlineShaderAdapter(slot);
    return;
  }
  if (slot.adapterId === 'mx-c-transparent-st') {
    assertMxCTransparentShaderAdapter(slot);
    return;
  }
  if (slot.adapterId === 'projectmx-weapon-test1-damage') {
    assertProjectMxShaderAdapter(slot);
    return;
  }
  if (slot.adapterId === 'mx-e-standard') {
    assertEStandardShaderAdapter(slot);
    return;
  }
  if (slot.adapterId === 'dsfx-matcap') {
    assertDsfxMatcapShaderAdapter(slot);
    return;
  }
  const rule = profileCustomShaderAdapters[slot.adapterId];
  if (!rule) return;
  const sourceIdentity = normalizedProfileShaderIdentity(slot.sourceShaderParsedName ?? slot.sourceShaderName);
  if (sourceIdentity !== rule.identity
    || String(slot.shaderProgramBlobSha256 ?? "").toLowerCase() !== rule.programBlobSha256
    || normalizedProfileReferenceKey(slot.sourceShaderReference) !== normalizedProfileReferenceKey(rule.sourceReference)) {
    throw new Error(`Profile custom shader adapter ${slot.adapterId} has an unverified source identity or program version.`);
  }
  throw new Error(`Source shader adapter ${slot.adapterId} requires a Viewer runtime adapter for ${rule.behavior} behavior; glTF-native output cannot preserve it.`);
}

function applyProfileMaterialStates(profile) {
  // Preserve the FBX2glTF material before applying any profile claim.  A
  // deduplicated GLB material can be claimed by several source slots; when a
  // later claim has a different exact state we must clone this pristine value,
  // rather than cloning the already-mutated state of the first claim.
  const baseMaterials = new Map((json.materials ?? []).map((material, index) => [index, JSON.parse(JSON.stringify(material))]));
  const materialClaims = new Map();
  const outputClaims = new Map();
  for (const renderer of profile.renderers ?? []) {
    const meshIndex = renderer.materialSlots?.[0]?.glb?.meshIndex ?? json.nodes?.[renderer.glbNodeIndex]?.mesh;
    const mesh = json.meshes?.[meshIndex];
    if (!mesh) throw new Error(`Profile renderer ${renderer.hierarchyPath} has no GLB mesh.`);
    const drawRank = Math.max(0, (profile.drawSequence ?? []).indexOf(sourceReferenceKey(renderer.sourceReference)));
    for (const slot of renderer.materialSlots ?? []) {
      const projectMxColorNormalization = materializeProjectMxColorAttributes(renderer, slot);
      assertProfileShaderAdapter(slot);
      if (!slot.glb) continue;
      const slotKey = `${sourceReferenceKey(renderer.sourceReference)}#${slot.slot}`;
      const materials = [...slot.glb.materialIndices];
      for (const [offset, primitiveIndex] of slot.glb.primitiveIndices.entries()) {
        const primitive = mesh.primitives[primitiveIndex];
        if (slot.adapterId === 'mx-character-eyemouth' && primitive.attributes) {
          // MX/C-EyesMouth ignores Unity vertex color on every bound renderer,
          // including secondary FX eye sprites outside the selected mouth slot.
          delete primitive.attributes.COLOR_0;
        }
        // MX/C-Hair ignores vertex RGB; alpha is only a rim-light mask,
        // so the unlit export must not multiply either into texture color.
        if (slot.adapterId === 'mx-character-hair'
          && (slot.sourceShaderParsedName || slot.sourceShaderName || '').toLowerCase() === 'mx/c-hair') {
          delete primitive.attributes.COLOR_0;
        }
        // Layer4 and General/Transparent use vertex alpha for rim lighting,
        // not opacity or RGB tint. Match the fallback on exact profile bindings.
        if (slot.adapterId === 'mx-character-general'
          && ['mx/c-general/layer4', 'mx/c-general/transparent'].includes((slot.sourceShaderParsedName || slot.sourceShaderName || '').toLowerCase())) {
          delete primitive.attributes.COLOR_0;
        }
        const sourceMaterialIndex = slot.glb.materialIndices[offset];
        if (!Number.isInteger(sourceMaterialIndex) || !baseMaterials.has(sourceMaterialIndex)) {
          throw new Error(`Profile renderer ${renderer.hierarchyPath} slot ${slot.slot} has no exact source GLB material index.`);
        }
        const claimSignature = materialClaimSignature(slot, drawRank, projectMxColorNormalization);
        const sourceClaims = materialClaims.get(sourceMaterialIndex) ?? new Map();
        let materialIndex = sourceClaims.get(claimSignature);
        if (!Number.isInteger(materialIndex)) {
          materialIndex = sourceClaims.size === 0
            ? sourceMaterialIndex
            : json.materials.push(JSON.parse(JSON.stringify(baseMaterials.get(sourceMaterialIndex)))) - 1;
          sourceClaims.set(claimSignature, materialIndex);
          materialClaims.set(sourceMaterialIndex, sourceClaims);
        }
        primitive.material = materialIndex;
        const claims = outputClaims.get(materialIndex) ?? new Set();
        claims.add(slotKey);
        outputClaims.set(materialIndex, claims);
        materials[offset] = materialIndex;
      }
      slot.glb.materialIndices = materials;
      slot.glb.materialIndex = materials[0];
      const staticDsfx = slot.adapterId === 'dsfx-static';
      const glitchDsfx = slot.adapterId === 'dsfx-glitch-tex';
      const mxUnlitOutline = slot.adapterId === 'mx-unlit-outline';
      const mxCTransparent = slot.adapterId === 'mx-c-transparent-st';
      const projectMx = slot.adapterId === 'projectmx-weapon-test1-damage';
      const eStandard = slot.adapterId === 'mx-e-standard';
      const matcapDsfx = slot.adapterId === 'dsfx-matcap';
      const sourceTexture = slot.materialProperties.textures?.find(item => item.name === (staticDsfx ? '_Texture' : projectMx ? '_mainTex' : matcapDsfx ? '_Main_Tex' : '_MainTex'));
      const glitchNoiseTexture = glitchDsfx ? slot.materialProperties.textures?.find(item => item.name === '_NoiseTex') : null;
      const projectMxSourceTexture = projectMx ? slot.materialProperties.textures?.find(item => item.name === '_sourceTex') : null;
      const projectMxNoiseTexture = projectMx ? slot.materialProperties.textures?.find(item => item.name === '_NoiseTex') : null;
      const matcapTexture = matcapDsfx ? slot.materialProperties.textures?.find(item => item.name === '_Matcap_Tex') : null;
      const projectMxExtraction = projectMx ? slot.projectMxShaderExtraction : null;
      const projectMxActivePass = projectMxExtraction?.passes?.[projectMxExtraction.activeVariant];
      const hasSourceTexture = !!sourceTexture?.texture && String(sourceTexture.texture.pathId) !== '0';
      const hasGlitchNoiseTexture = !!glitchNoiseTexture?.texture && String(glitchNoiseTexture.texture.pathId) !== '0';
      const hasProjectMxSourceTexture = !!projectMxSourceTexture?.texture && String(projectMxSourceTexture.texture.pathId) !== '0';
      const hasProjectMxNoiseTexture = !!projectMxNoiseTexture?.texture && String(projectMxNoiseTexture.texture.pathId) !== '0';
      const hasMatcapTexture = !!matcapTexture?.texture && String(matcapTexture.texture.pathId) !== '0';
      const maskTexture = mxCTransparent ? slot.materialProperties.textures?.find(item => item.name === '_MaskTex') : null;
      const hasMaskTexture = !!maskTexture?.texture && String(maskTexture.texture.pathId) !== '0';
      if (mxCTransparent && (!hasSourceTexture || !hasMaskTexture)) throw new Error(`MX/C-Transparent-ST ${slot.sourceMaterialName ?? '(unnamed)'} has no exact MainTex and MaskTex bindings.`);
      if (projectMx && (!hasSourceTexture || !hasProjectMxSourceTexture || (projectMxActivePass?.usesNoiseTexture && !hasProjectMxNoiseTexture))) {
        throw new Error(`ProjectMX/WeaponTest1Damage ${slot.sourceMaterialName ?? '(unnamed)'} has no exact _mainTex and _sourceTex bindings.`);
      }
      if (glitchDsfx && !hasGlitchNoiseTexture) {
        throw new Error(`DSFX/FX_SHADER_Glitch_Tex ${slot.sourceMaterialName ?? '(unnamed)'} has no exact _NoiseTex binding.`);
      }
      if (matcapDsfx && (!hasSourceTexture || !hasMatcapTexture)) {
        throw new Error(`DSFX/FX_SHADER_Matcap ${slot.sourceMaterialName ?? '(unnamed)'} has no exact _Main_Tex and _Matcap_Tex bindings.`);
      }
      const projectMxMainTextureInfo = projectMx && sourceTexture ? sourceTextureInfo(slot, sourceTexture) : null;
      const projectMxSourceTextureInfo = projectMx && projectMxSourceTexture ? sourceTextureInfo(slot, projectMxSourceTexture) : null;
      const projectMxNoiseTextureInfo = projectMx && projectMxNoiseTexture && projectMxActivePass?.usesNoiseTexture
        ? sourceTextureInfo(slot, projectMxNoiseTexture) : null;
      const eStandardExtraction = eStandard ? slot.eStandardShaderExtraction : null;
      const eStandardMainTextureInfo = eStandard && sourceTexture ? sourceTextureInfo(slot, sourceTexture) : null;
      const glitchNoiseTextureInfo = glitchDsfx && glitchNoiseTexture ? sourceTextureInfo(slot, glitchNoiseTexture) : null;
      const matcapMainTextureInfo = matcapDsfx && sourceTexture ? sourceTextureInfo(slot, sourceTexture) : null;
      const matcapTextureInfo = matcapDsfx && matcapTexture ? sourceTextureInfo(slot, matcapTexture) : null;
      const staticTextureInfo = staticDsfx && hasSourceTexture ? sourceTextureInfo(slot, sourceTexture) : null;
      for (const materialIndex of new Set(materials)) {
        const material = json.materials[materialIndex];
        if (!material) throw new Error(`Profile material index ${materialIndex} is missing.`);
        material.alphaMode = slot.renderState.alphaMode;
        if (slot.renderState.alphaMode === 'MASK') material.alphaCutoff = Number(slot.materialProperties.floats?._Cutoff) || 0.5;
        else delete material.alphaCutoff;
        material.doubleSided = slot.renderState.doubleSided ?? false;
        if (glitchDsfx && material.pbrMetallicRoughness?.baseColorTexture !== undefined) {
          // `_MainTex` is the source-authorized Unity white default (a null
          // serialized pointer), so it must not be represented as a GLB
          // base-color image.  The Viewer binds that default explicitly.
          delete material.pbrMetallicRoughness.baseColorTexture;
        }
        if (slot.dsfxMaterialVariant === profileDsfxWakamoEyeWhiteDefault.materialVariant) {
          // The exact Wakamo eye source has a null `_Texture` pointer and the
          // verified shader declares Unity's white 2D default. Do not leave a
          // same-named FBX texture bound; the Viewer supplies that default.
          if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.baseColorTexture;
        }
        const sourceColor = slot.adapterId === 'mx-character-eyemouth'
          ? slot.adapterSettings.eyeTint
          : slot.adapterSettings.baseColorTint
            ?? (projectMx ? colorArray(slot.materialProperties?.colors?._Color) : null);
        if (sourceColor) {
          material.pbrMetallicRoughness ??= {};
          const multiply = staticDsfx && slot.adapterSettings.dsfxMultiply !== null && slot.adapterSettings.dsfxMultiply !== undefined
            ? Number(slot.adapterSettings.dsfxMultiply) : 1;
          material.pbrMetallicRoughness.baseColorFactor = staticDsfx
            ? sourceColor.map(value => Number(value) * multiply)
            : sourceColor;
        }
        if (staticDsfx || glitchDsfx || mxUnlitOutline) {
          json.extensionsUsed ??= [];
          if (!json.extensionsUsed.includes('KHR_materials_unlit')) json.extensionsUsed.push('KHR_materials_unlit');
          material.extensions = { ...material.extensions, KHR_materials_unlit: {} };
        }
        if ((projectMx || eStandard || matcapDsfx) && material.extensions?.KHR_materials_unlit !== undefined) {
          // FBX2glTF is invoked with --khr-materials-unlit globally.  These
          // source-verified custom slots are lit, so remove only the
          // extension on this exact output material.  Keep any unrelated
          // material extensions and the document-level extensionsUsed list.
          const { KHR_materials_unlit: _ignored, ...remainingExtensions } = material.extensions;
          if (Object.keys(remainingExtensions).length) material.extensions = remainingExtensions;
          else delete material.extensions;
        }
        if (hasSourceTexture) {
          material.pbrMetallicRoughness ??= {};
          // Static DSFX `_Texture` is authoritative even if FBX2glTF emitted
          // a base-color texture under the same material name. MainTex keeps
          // the legacy preserve-existing-binding behavior.
          const texture = projectMx || eStandard
            ? projectMxMainTextureInfo
              ?? eStandardMainTextureInfo
            : staticDsfx || mxCTransparent || matcapDsfx || slot.adapterId === 'mx-character-eyemouth'
            ? staticTextureInfo ?? sourceTextureInfo(slot, sourceTexture)
            : material.pbrMetallicRoughness.baseColorTexture
              ?? sourceTextureInfo(slot, sourceTexture);
          material.pbrMetallicRoughness.baseColorTexture = texture;
          applySourceTextureTransform(texture, sourceTexture, slot.sourceMaterialName);
        }
        const maskTextureInfo = mxCTransparent && maskTexture ? sourceTextureInfo(slot, maskTexture) : null;
        if (maskTextureInfo) {
          applySourceTextureTransform(maskTextureInfo, maskTexture, `${slot.sourceMaterialName} _MaskTex`);
        }
        if (glitchNoiseTextureInfo && glitchNoiseTexture) {
          applySourceTextureTransform(glitchNoiseTextureInfo, glitchNoiseTexture, `${slot.sourceMaterialName} _NoiseTex`);
        }
        if (matcapTextureInfo && matcapTexture) {
          applySourceTextureTransform(matcapTextureInfo, matcapTexture, `${slot.sourceMaterialName} _Matcap_Tex`);
        }
        const profileSlots = [...(outputClaims.get(materialIndex) ?? [])].sort();
        const { renderingProfileSlot: _oldRenderingProfileSlot, renderingProfileSlots: _oldRenderingProfileSlots, dsfxMaterialVariant: _oldDsfxMaterialVariant, ...priorChibi } = material.extras?.chibi ?? {};
        material.extras = {
          ...material.extras,
          chibi: {
            ...priorChibi,
            depthWrite: slot.renderState.depthWrite,
            depthTest: slot.renderState.depthTest,
            depthFunction: slot.renderState.depthFunction,
            cullMode: slot.renderState.cullMode,
            doubleSided: slot.renderState.doubleSided,
            drawLayer: slot.renderState.layer,
            sourceQueue: slot.renderState.sourceQueue,
            renderOrder: (slot.renderState.layer === 'transparent' ? 10000 : 0) + drawRank,
            polygonOffsetFactor: slot.renderState.polygonOffsetFactor,
            polygonOffsetUnits: slot.renderState.polygonOffsetUnits,
            ...(profileSlots.length === 1 ? { renderingProfileSlot: profileSlots[0] } : {}),
            renderingProfileSlots: profileSlots,
            adapterId: slot.adapterId,
            zCorrection: slot.adapterSettings.zCorrection,
            alphaMode: slot.renderState.alphaMode,
            blend: { ...slot.renderState.blend },
            textureProperty: glitchDsfx ? '_NoiseTex' : sourceTexture?.name ?? null,
            unlit: staticDsfx || glitchDsfx || mxUnlitOutline,
            renderPass: mxUnlitOutline ? 'base' : glitchDsfx || mxCTransparent || projectMx || eStandard || matcapDsfx ? 'forward' : null,
            ...(mxUnlitOutline ? {
              // Keep both source-selected passes in the published artifact.
              // The Viewer consumes the outline pass for the second draw, but
              // retaining the Forward pass proves that the first draw is the
              // same source program selected during Admin import.
              shaderExtraction: slot.shaderExtraction,
              outlinePass: slot.shaderExtraction.passes.outline,
              outlineTint: slot.adapterSettings.outlineTint,
              outlineZCorrection: slot.adapterSettings.outlineZCorrection,
            } : {}),
            ...(mxCTransparent ? {
              transparentShaderExtraction: slot.transparentShaderExtraction,
              transparentVariant: slot.adapterSettings.transparentVariant,
              transparentMaterialProperties: slot.materialProperties,
              maskTexture: maskTextureInfo,
              depthOnlyPass: slot.transparentShaderExtraction?.passes.depth,
            } : {}),
            ...(projectMx ? {
              projectMxShaderExtraction: projectMxExtraction,
              projectMxMaterialProperties: slot.materialProperties,
              ...(projectMxColorNormalization ? { projectMxColorNormalization } : {}),
              projectMxTextures: {
                mainTex: { index: projectMxMainTextureInfo.index },
                sourceTex: { index: projectMxSourceTextureInfo.index },
                ...(projectMxNoiseTextureInfo ? { noiseTex: { index: projectMxNoiseTextureInfo.index } } : {}),
              },
            } : {}),
            ...(eStandard ? {
              eStandardShaderExtraction: eStandardExtraction,
              eStandardMaterialProperties: slot.materialProperties,
              eStandardTextures: { mainTex: { index: eStandardMainTextureInfo.index } },
            } : {}),
            ...(matcapDsfx ? {
              matcapShaderExtraction: slot.matcapShaderExtraction,
              matcapMaterialProperties: slot.materialProperties,
              matcapTextures: {
                mainTex: { index: matcapMainTextureInfo.index },
                matcapTex: { index: matcapTextureInfo.index },
              },
              matcapShadowPass: slot.matcapShaderExtraction?.passes.shadow,
            } : {}),
            ...(glitchDsfx ? {
              glitchShaderExtraction: slot.glitchShaderExtraction,
              glitchMaterialProperties: slot.materialProperties,
              glitchTextures: {
                mainTex: { default: 'unity-white' },
                noiseTex: { index: glitchNoiseTextureInfo.index },
              },
              glitchShadowPass: slot.glitchShaderExtraction?.passes.shadow,
            } : {}),
            ...(staticDsfx && normalizedProfileShaderIdentity(slot.sourceShaderParsedName ?? slot.sourceShaderName) === "dsfx/fx_shader_additive_0" ? {
              dsfxShaderExtraction: slot.dsfxShaderExtraction,
              dsfxMaterialProperties: slot.materialProperties,
              dsfxTextures: { texture: { index: staticTextureInfo.index } },
            } : {}),
            ...(staticDsfx && normalizedProfileShaderIdentity(slot.sourceShaderParsedName ?? slot.sourceShaderName) === "dsfx/fx_shader_alphablend_add" ? {
              dsfxShaderExtraction: slot.dsfxShaderExtraction,
              dsfxMaterialProperties: slot.materialProperties,
              dsfxTextures: slot.dsfxMaterialVariant === profileDsfxWakamoEyeWhiteDefault.materialVariant
                ? { texture: { default: 'unity-white' } }
                : { texture: { index: staticTextureInfo.index } },
              dsfxRenderStateVariant: slot.dsfxRenderStateVariant,
              ...(slot.dsfxMaterialVariant ? { dsfxMaterialVariant: slot.dsfxMaterialVariant } : {}),
            } : {}),
            ...(staticDsfx && normalizedProfileShaderIdentity(slot.sourceShaderParsedName ?? slot.sourceShaderName) === "dsfx/fx_shader_alphablend_0" ? {
              dsfxRenderStateVariant: slot.dsfxRenderStateVariant,
            } : {}),
            sourceMaterialReference: slot.sourceMaterialReference,
            sourceShaderReference: slot.sourceShaderReference,
          },
        };
      }
    }
  }
}

const flipEyeMouthV = new Set(config.flipEyeMouthV ?? []);
const flipEyeMouthU = new Set(config.flipEyeMouthU ?? []);
const eyeMouthMaterials = new Set();

if (config.renderingProfile) {
  synthesizeBuiltinQuads(config.renderingProfile);
  bindRenderingProfile(config.renderingProfile);
  applyProfileMaterialStates(config.renderingProfile);
}
const sourceMaterials = new Map((config.materialMetadata ?? []).map(material => [material.name, material]));
const forceMaskMaterials = new Set(config.forceMaskMaterials ?? []);
for (const [materialIndex, material] of (json.materials ?? []).entries()) {
  if (config.incompleteImport) continue;
  // Exact profile material state is authoritative for profile-bound slots.
  // Legacy name/shader heuristics must not turn a source BLEND/MASK decision
  // into a different alpha mode after profile binding.
  if (config.renderingProfile && (material.extras?.chibi?.renderingProfileSlot
    || Array.isArray(material.extras?.chibi?.renderingProfileSlots))) continue;
  const source = sourceMaterials.get(material.name);
  const shader = source?.shaderName ?? '';
  if (/_(Body|Hair|Halo)$/.test(material.name ?? '') || /MXCharacter(?:General|Hair|Halo)/i.test(shader)) material.doubleSided = true;
  const transparentShader = /Transparent|Unlit_Tex_Col_HDR|FX_SHADER_AlphaBlend(?:_Add)?_0|MXEnvWaterV2/i.test(shader);
  const opaqueCharacterName = /_(?:Body|Hair|Face|Eyebrow)(?:\.\d+)?$/i.test(material.name ?? '');
  if (/MXCharacterEyesMouth/i.test(shader) || /EyeMouth|EyeMoutn/i.test(material.name ?? '')) {
    eyeMouthMaterials.add(materialIndex);
    if (/EyeMouth/i.test(material.name ?? '')) {
      // EyeMouth sprites carry their cut-out in the PNG alpha channel. Alpha
      // testing keeps the transparent border out of the face while avoiding
      // order-dependent blending against hair and face layers.
      material.alphaMode = 'MASK';
      material.alphaCutoff = 0.5;
      delete material.doubleSided;
      material.extras = {
        ...material.extras,
        chibi: {
          ...material.extras?.chibi,
          // The source face and EyeMouth meshes overlap in depth after FBX
          // conversion. Pull the sprite layer toward the camera without
          // disabling depth testing, so hair/accessory occlusion remains
          // available while the eyes are not hidden by the opaque face.
          depthWrite: false,
          depthTest: false,
          renderOrder: 20,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        },
      };
    } else {
      material.alphaMode = 'OPAQUE';
      delete material.alphaCutoff;
      if (material.extras && typeof material.extras === 'object') {
        const { chibi: _ignored, ...extras } = material.extras;
        material.extras = extras;
      }
    }
  }
  else if (transparentShader) material.alphaMode = 'BLEND';
  else if (/MXCharacter(?:Face|Eyebrow|General|Hair|Halo)/i.test(shader) || opaqueCharacterName) material.alphaMode = 'OPAQUE';
  if (forceMaskMaterials.has(material.name)) {
    material.alphaMode = 'MASK';
    material.alphaCutoff = 0.5;
  }
  if (shader && !/^(?:MXCharacter(?:GeneralV2(?:Single(?:InlineNormalMap|Inline|NoOutlineShadow)?|Inline|Transparent)?|FaceV2(?:_Cutin(?:_DF)?)?|HairV2(?:_Transparent)?|EyebrowV2(?:Simple)?|EyesMouthV2|Halo(?:Tex|Simple)?|Simple(?:Transparent(?:ST)?)?)|MXGeneralUnlit(?:Texture|VCTex|VC)?|MXWeapon(?:1Damage|NoOutline)?|MXTransparentOutline|MXUnlitOutline|MXEnv(?:Standard|WaterV2)|Unlit_Tex_Col_HDR|FX_SHADER_(?:AlphaBlend(?:_Add)?_0|Matcap))$/i.test(shader)) {
    throw new Error(`Unsupported source shader ${shader} on material ${material.name}`);
  }
}

const haloMaterials = new Set((json.materials ?? []).flatMap((material, index) => {
  const source = sourceMaterials.get(material.name);
  return /MXCharacterHalo/i.test(source?.shaderName ?? '') || /_Halo(?:\.\d+)?$/i.test(material.name ?? '') ? [index] : [];
}));
const removeVertexColorMaterials = new Set(config.removeVertexColorMaterials ?? []);
for (const mesh of json.meshes ?? []) {
  for (const primitive of mesh.primitives ?? []) {
    if (haloMaterials.has(primitive.material) || removeVertexColorMaterials.has(json.materials?.[primitive.material]?.name)) {
      delete primitive.attributes.COLOR_0;
    }
  }
}

const componentReaders = {
  5120: [1, "readInt8"],
  5121: [1, "readUInt8"],
  5122: [2, "readInt16LE"],
  5123: [2, "readUInt16LE"],
  5125: [4, "readUInt32LE"],
  5126: [4, "readFloatLE"],
};
const componentCounts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readAccessor(index) {
  const accessor = json.accessors[index];
  const view = json.bufferViews[accessor.bufferView];
  const [componentSize, reader] = componentReaders[accessor.componentType];
  const componentCount = componentCounts[accessor.type];
  const stride = view.byteStride ?? componentSize * componentCount;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const values = [];
  for (let row = 0; row < accessor.count; row += 1) {
    const value = [];
    for (let component = 0; component < componentCount; component += 1) {
      value.push(bin[reader](start + row * stride + component * componentSize));
    }
    values.push(value);
  }
  return values;
}

// FBX2glTF can preserve a handful of out-of-range JOINTS_0 values from a
// Unity face variant. Three.js rightfully rejects those at render time, so
// clamp them to the last valid joint while keeping the original geometry.
function repairSkinIndices() {
  const writers = { 5121: 'writeUInt8', 5123: 'writeUInt16LE', 5125: 'writeUInt32LE' };
  let repaired = 0;
  for (const node of json.nodes ?? []) {
    if (!Number.isInteger(node.mesh) || !Number.isInteger(node.skin)) continue;
    const jointCount = json.skins?.[node.skin]?.joints?.length ?? 0;
    if (!jointCount) continue;
    for (const primitive of json.meshes?.[node.mesh]?.primitives ?? []) {
      const accessorIndex = primitive.attributes?.JOINTS_0;
      const accessor = Number.isInteger(accessorIndex) ? json.accessors?.[accessorIndex] : null;
      const view = accessor ? json.bufferViews?.[accessor.bufferView] : null;
      const writer = accessor ? writers[accessor.componentType] : null;
      const components = accessor ? componentCounts[accessor.type] : 0;
      const componentSize = accessor ? componentReaders[accessor.componentType]?.[0] : 0;
      if (!accessor || !view || !writer || !components || !componentSize) continue;
      const stride = view.byteStride ?? componentSize * components;
      const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      for (let row = 0; row < accessor.count; row += 1) {
        for (let component = 0; component < components; component += 1) {
          const offset = start + row * stride + component * componentSize;
          const value = bin[componentReaders[accessor.componentType][1]](offset);
          if (value < jointCount) continue;
          bin[writer](jointCount - 1, offset);
          repaired += 1;
        }
      }
    }
  }
  return repaired;
}

if (config.sourceFaceSkinPath) {
  let repaired = 0;
  for (const source of JSON.parse(fs.readFileSync(config.sourceFaceSkinPath, 'utf8'))) {
    try {
      repaired += repairFaceSkin(json, [source], nodeHierarchyPaths(), readAccessor, (rows, joints) => {
      if (!joints) return appendAccessor(rows, 'VEC4', 4);
      const bytes = Buffer.alloc(rows.length * 8);
      rows.flat().forEach((value, index) => bytes.writeUInt16LE(value, index * 2));
      return json.accessors.push({ bufferView: appendView(bytes), componentType: 5123, count: rows.length, type: 'VEC4' }) - 1;
      });
    } catch (error) {
      const warning = `Source skin retained exported weights: ${error.message}`;
      if (!config.incompleteImport) throw error;
      config.incompleteImport.warnings.push(warning);
      console.warn(warning);
    }
  }
  console.log(`Restored source skin on ${repaired} exported vertices`);
}
const repairedSkinIndices = repairSkinIndices();
if (repairedSkinIndices) console.log(`Repaired ${repairedSkinIndices} out-of-range skin indices`);

// Some AssetStudio exports contain NaN/Infinity vertex colors on equipment
// meshes. Three.js propagates those values into the fragment color, producing
// black blocks or otherwise broken accessories. The channel is optional, so
// remove it only from primitives whose decoded values are actually invalid.
function removeInvalidVertexColors() {
  let removed = 0;
  for (const node of json.nodes ?? []) {
    if (!Number.isInteger(node.mesh)) continue;
    for (const primitive of json.meshes?.[node.mesh]?.primitives ?? []) {
      const accessorIndex = primitive.attributes?.COLOR_0;
      const accessor = Number.isInteger(accessorIndex) ? json.accessors?.[accessorIndex] : null;
      const view = accessor ? json.bufferViews?.[accessor.bufferView] : null;
      const readerInfo = accessor ? componentReaders[accessor.componentType] : null;
      const components = accessor ? componentCounts[accessor.type] : 0;
      if (!accessor || !view || !readerInfo || !components) continue;
      const [componentSize, reader] = readerInfo;
      const stride = view.byteStride ?? componentSize * components;
      const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      let invalid = false;
      for (let row = 0; row < accessor.count && !invalid; row += 1) {
        for (let component = 0; component < components; component += 1) {
          const value = bin[reader](start + row * stride + component * componentSize);
          if (!Number.isFinite(value)) { invalid = true; break; }
        }
      }
      if (invalid) { delete primitive.attributes.COLOR_0; removed += 1; }
    }
  }
  return removed;
}
const invalidVertexColorPrimitives = removeInvalidVertexColors();
if (invalidVertexColorPrimitives) console.log(`Removed invalid vertex colors from ${invalidVertexColorPrimitives} primitive(s)`);
if (config.renderingProfile) validateProjectMxColorNormalization(config.renderingProfile);

// MX/C-EyesMouth selects the mouth where Unity UV.x/y <= .25, then
// samples Character_Mouth using UV * .5 + (column, row) / 8.
// FBX2glTF flips V, so the mouth occupies V >= .75 in this GLB.
function appendView(bytes) {
  const offset = bin.length;
  bin = Buffer.concat([bin, bytes, Buffer.alloc((4 - bytes.length % 4) % 4)]);
  return json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
}
// FBX2glTF can drop a texture assignment when a Unity texture name contains
// non-ASCII characters (for example CH0190_B\u206fody).  The conversion step
// exports those source textures explicitly and passes them here so the
// published material remains textured instead of rendering white.
function applyMaterialTextureOverrides(overrides) {
  json.images ??= [];
  json.bufferViews ??= [];
  for (const override of overrides ?? []) {
    if (!override || typeof override.material !== 'string' || typeof override.path !== 'string' || !fs.existsSync(override.path)) continue;
    const material = (json.materials ?? []).find((entry) => entry.name === override.material);
    if (!material) continue;
    material.pbrMetallicRoughness ??= {};
    if (material.pbrMetallicRoughness.baseColorTexture) continue;
    const imageIndex = json.images.push({
      name: override.textureName ?? `${override.material}.png`,
      mimeType: 'image/png',
      bufferView: appendView(fs.readFileSync(override.path)),
    }) - 1;
    json.samplers ??= [];
    const samplerIndex = json.samplers.push({ magFilter: 9729, minFilter: 9729, wrapS: 10497, wrapT: 10497 }) - 1;
    json.textures ??= [];
    const textureIndex = json.textures.push({
      name: override.textureName ?? override.material,
      sampler: samplerIndex,
      source: imageIndex,
    }) - 1;
    material.pbrMetallicRoughness.baseColorTexture = { index: textureIndex, texCoord: 0 };
  }
}
applyMaterialTextureOverrides(config.materialTextureOverrides);
function appendAccessor(values, type, components) {
  const bytes = Buffer.alloc(values.length * components * 4);
  values.flat().forEach((value, index) => bytes.writeFloatLE(value, index * 4));
  return json.accessors.push({ bufferView: appendView(bytes), componentType: 5126, count: values.length, type }) - 1;
}
function appendIndices(indices) {
  const bytes = Buffer.alloc(indices.length * 4);
  indices.forEach((value, index) => bytes.writeUInt32LE(value, index * 4));
  return json.accessors.push({ bufferView: appendView(bytes), componentType: 5125, count: indices.length, type: 'SCALAR' }) - 1;
}

function normalizedBuiltinFile(value) {
  return typeof value === 'string' ? value.replaceAll('\\', '/').split('/').at(-1)?.toLowerCase() ?? '' : '';
}

function normalizedBuiltinGuid(value) {
  return typeof value === 'string' ? value.replaceAll('-', '').toLowerCase() : '';
}

function canonicalBuiltinQuad(pointer) {
  if (!pointer || normalizedBuiltinFile(pointer.file) !== UNITY_BUILTIN_RESOURCES_FILE
    || String(pointer.pathId) !== UNITY_BUILTIN_QUAD_PATH_ID) return null;
  const typed = pointer.builtinResource;
  if (typed && (typed.kind !== 'unity-builtin-resource'
    || normalizedBuiltinGuid(typed.guid) !== UNITY_BUILTIN_RESOURCES_GUID
    || normalizedBuiltinFile(typed.file) !== UNITY_BUILTIN_RESOURCES_FILE
    || String(typed.pathId) !== UNITY_BUILTIN_QUAD_PATH_ID
    || typed.name !== UNITY_BUILTIN_QUAD_NAME)) return null;
  const guid = normalizedBuiltinGuid(pointer.externalGuid ?? typed?.guid);
  if (guid !== UNITY_BUILTIN_RESOURCES_GUID) return null;
  return {
    kind: 'unity-builtin-resource', guid: UNITY_BUILTIN_RESOURCES_GUID,
    file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID, name: UNITY_BUILTIN_QUAD_NAME,
  };
}

function sourceMaterialReferenceKey(reference) {
  return reference
    ? `${String(reference.bundleSha256).toLowerCase()}:${String(reference.serializedFile).toLowerCase()}:${String(reference.objectId)}`
    : '';
}

function exactBuiltinMaterialIndex(slot, label) {
  if (!slot?.sourceMaterialReference || typeof slot.sourceMaterialName !== 'string' || !slot.sourceMaterialName) {
    throw new Error(`${label} built-in Quad slot has no exact source material identity.`);
  }
  json.materials ??= [];
  const referenceKey = sourceMaterialReferenceKey(slot.sourceMaterialReference);
  const byReference = (json.materials ?? []).flatMap((material, index) =>
    sourceMaterialReferenceKey(material?.extras?.chibi?.sourceMaterialReference) === referenceKey ? [index] : []);
  if (byReference.length === 1) return byReference[0];
  if (byReference.length > 1) {
    throw new Error(`${label} built-in Quad slot ${slot.slot} material ${slot.sourceMaterialName} maps to multiple GLB materials with the same exact source identity.`);
  }
  const conflictsWithSourceProvenance = (material) => {
    const sourceReference = material?.extras?.chibi?.sourceMaterialReference;
    return sourceReference && sourceMaterialReferenceKey(sourceReference) !== referenceKey;
  };
  const exactByName = (json.materials ?? []).flatMap((material, index) => material?.name === slot.sourceMaterialName ? [index] : []);
  if (exactByName.length === 1) {
    if (conflictsWithSourceProvenance(json.materials[exactByName[0]])) {
      throw new Error(`${label} built-in Quad slot ${slot.slot} material ${slot.sourceMaterialName} has conflicting GLB source provenance.`);
    }
    return exactByName[0];
  }
  const suffixedByName = (json.materials ?? []).flatMap((material, index) => {
    const name = material?.name;
    return typeof name === 'string' && name.replace(/\.\d+$/, '') === slot.sourceMaterialName ? [index] : [];
  });
  if (suffixedByName.length === 0) {
    // AssetStudio/FBX2glTF can preserve a built-in Quad's transform node while
    // omitting the source material entirely because the Mesh PPtr resolves in
    // Unity's built-in resources file.  The profile still carries the exact
    // material object identity, so create a minimal glTF entry for that
    // identity instead of guessing from exporter order or a different name.
    return json.materials.push({
      name: slot.sourceMaterialName,
      pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 1 },
      extras: {
        chibi: {
          synthesizedBuiltinMaterial: true,
          sourceMaterialReference: slot.sourceMaterialReference,
          sourceShaderReference: slot.sourceShaderReference ?? null,
        },
      },
    }) - 1;
  }
  if (suffixedByName.length !== 1) {
    throw new Error(`${label} built-in Quad slot ${slot.slot} material ${slot.sourceMaterialName} does not resolve to exactly one GLB material.`);
  }
  if (conflictsWithSourceProvenance(json.materials[suffixedByName[0]])) {
    throw new Error(`${label} built-in Quad slot ${slot.slot} material ${slot.sourceMaterialName} has conflicting GLB source provenance.`);
  }
  return suffixedByName[0];
}

function synthesizeBuiltinQuads(profile) {
  for (const renderer of profile?.renderers ?? []) {
    const sourceMesh = renderer.sourceMesh;
    const hasBuiltinFields = !!sourceMesh && (sourceMesh.builtinResource !== undefined
      || normalizedBuiltinFile(sourceMesh.file) === UNITY_BUILTIN_RESOURCES_FILE
      || (!sourceMesh.sourceReference && String(sourceMesh.pathId) === UNITY_BUILTIN_QUAD_PATH_ID));
    if (!hasBuiltinFields) continue;
    const builtinResource = canonicalBuiltinQuad(sourceMesh);
    const label = `Renderer ${renderer.hierarchyPath ?? renderer.name ?? '(unnamed)'}`;
    if (!builtinResource) throw new Error(`${label} has an unknown or incomplete Unity built-in mesh identity.`);
    if (sourceMesh.sourceReference) throw new Error(`${label} built-in Quad has an unexpected imported mesh source reference.`);
    if (renderer.rendererType !== 'MeshRenderer') throw new Error(`${label} built-in Quad must be an unskinned MeshRenderer.`);
    if (!renderer.hierarchyPath) throw new Error(`${label} built-in Quad has no exact source hierarchy path.`);

    const paths = nodeHierarchyPaths();
    const matches = (json.nodes ?? []).flatMap((node, index) => paths[index] === renderer.hierarchyPath ? [index] : []);
    if (matches.length !== 1) throw new Error(`${label} built-in Quad maps to ${matches.length} GLB nodes; expected exactly one.`);
    const nodeIndex = matches[0];
    const node = json.nodes[nodeIndex];
    if (Number.isInteger(node.skin)) throw new Error(`${label} built-in Quad exported with a skin; built-in Quads must be unskinned.`);

    json.bufferViews ??= [];
    json.accessors ??= [];
    json.meshes ??= [];
    const positions = appendAccessor([
      [-0.5, -0.5, 0], [-0.5, 0.5, 0], [0.5, 0.5, 0], [0.5, -0.5, 0],
    ], 'VEC3', 3);
    const normals = appendAccessor([
      [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],
    ], 'VEC3', 3);
    const uvs = appendAccessor([
      [0, 0], [0, 1], [1, 1], [1, 0],
    ], 'VEC2', 2);
    const indices = appendIndices([0, 1, 2, 0, 2, 3]);
    // The inventory preserves Unity's serialized material-slot order.  Keep
    // that order here so repeated slot variants cannot be reassigned by a
    // name- or exporter-order guess.
    const materialSlots = [...(renderer.materialSlots ?? [])];
    if (!materialSlots.length) throw new Error(`${label} built-in Quad has no exact source material slots.`);
    const primitives = materialSlots.map(slot => ({
      attributes: { POSITION: positions, NORMAL: normals, TEXCOORD_0: uvs },
      indices, mode: 4, material: exactBuiltinMaterialIndex(slot, label),
    }));
    const meshIndex = json.meshes.push({
      name: `${node.name ?? 'Quad'}_UnityBuiltinQuad`, primitives,
      extras: { chibi: { synthesizedBuiltinResource: builtinResource } },
    }) - 1;
    // Preserve the exported node's authored transform, children, and default
    // visibility.  Assigning only mesh and provenance keeps source hierarchy
    // semantics intact while making the unskinned Quad renderable.
    node.mesh = meshIndex;
    node.extras = {
      ...node.extras,
      chibi: {
        ...node.extras?.chibi,
        synthesizedBuiltinResource: builtinResource,
      },
    };
  }
}

const mouthGeometryEpsilon = 1e-10;

function normalizedAccessorComponent(value, componentType, normalized) {
  if (!normalized) return value;
  if (componentType === 5120) return Math.max(-1, value / 127);
  if (componentType === 5121) return value / 255;
  if (componentType === 5122) return Math.max(-1, value / 32767);
  if (componentType === 5123) return value / 65535;
  if (componentType === 5125) return value / 4294967295;
  return value;
}

function mouthAccessor(index, semantic, label) {
  const accessor = json.accessors?.[index];
  if (accessor?.sparse) throw new Error(`${label} attribute ${semantic} uses a sparse accessor; topology-safe mouth clipping is unsupported.`);
  const view = accessor && json.bufferViews?.[accessor.bufferView];
  const readerInfo = accessor && componentReaders[accessor.componentType];
  const components = accessor && componentCounts[accessor.type];
  if (!accessor || !view || !readerInfo || !components || !['SCALAR', 'VEC2', 'VEC3', 'VEC4'].includes(accessor.type)) {
    throw new Error(`${label} attribute ${semantic} references an unsupported accessor shape.`);
  }
  if (!Number.isInteger(accessor.count) || accessor.count < 0) throw new Error(`${label} attribute ${semantic} has an invalid accessor count.`);
  const viewOffset = view.byteOffset ?? 0;
  const accessorOffset = accessor.byteOffset ?? 0;
  if (!Number.isInteger(viewOffset) || viewOffset < 0 || !Number.isInteger(accessorOffset) || accessorOffset < 0 || !Number.isInteger(view.byteLength) || view.byteLength < 0) {
    throw new Error(`${label} attribute ${semantic} has an invalid accessor offset or buffer-view length.`);
  }
  const stride = view.byteStride ?? readerInfo[0] * components;
  const start = viewOffset + accessorOffset;
  const required = Math.max(0, accessor.count - 1) * stride + readerInfo[0] * components;
  if (!Number.isInteger(stride) || stride < readerInfo[0] * components || viewOffset + view.byteLength > bin.length || accessorOffset + required > view.byteLength || start + required > bin.length) {
    throw new Error(`${label} attribute ${semantic} has an out-of-bounds accessor.`);
  }
  const values = readAccessor(index).map(row => row.map(value => normalizedAccessorComponent(value, accessor.componentType, accessor.normalized === true)));
  return { index, accessor, values, components, type: accessor.type, componentType: accessor.componentType };
}

function mouthIndices(index, label) {
  const source = mouthAccessor(index, 'indices', label);
  if (source.type !== 'SCALAR' || ![5121, 5123, 5125].includes(source.componentType) || source.accessor.normalized) {
    throw new Error(`${label} uses an unsupported index accessor; indexed TRIANGLES with unsigned integer indices are required.`);
  }
  if (source.values.length % 3 !== 0) throw new Error(`${label} has an incomplete triangle index list.`);
  const indices = source.values.flat();
  if (indices.some(value => !Number.isInteger(value) || value < 0)) throw new Error(`${label} has a non-integer triangle index.`);
  return indices;
}

function mouthAttributeKey(targetIndex, semantic) {
  return `${targetIndex === null ? 'attribute' : `target-${targetIndex}`}:${semantic}`;
}

function mouthAttributeSpecs(primitive, label) {
  if (!primitive.attributes || typeof primitive.attributes !== 'object' || Array.isArray(primitive.attributes)) throw new Error(`${label} has no vertex attributes to clip.`);
  const specs = [];
  const add = (targetIndex, semantic, index) => {
    if (!Number.isInteger(index)) throw new Error(`${label} attribute ${semantic} has no exact accessor index.`);
    const source = mouthAccessor(index, semantic, label);
    if (targetIndex === null && /^JOINTS_\d+$/.test(semantic)) {
      if (source.type !== 'VEC4' || ![5121, 5123, 5125].includes(source.componentType) || source.accessor.normalized) {
        throw new Error(`${label} uses an unsupported ${semantic} accessor; unnormalized unsigned integer VEC4 data is required for skinning.`);
      }
    }
    if (targetIndex === null && /^WEIGHTS_\d+$/.test(semantic) && source.type !== 'VEC4') {
      throw new Error(`${label} uses an unsupported ${semantic} accessor; VEC4 data is required for skinning.`);
    }
    specs.push({ ...source, targetIndex, semantic, key: mouthAttributeKey(targetIndex, semantic) });
  };
  for (const [semantic, index] of Object.entries(primitive.attributes)) add(null, semantic, index);
  if (primitive.targets !== undefined && !Array.isArray(primitive.targets)) throw new Error(`${label} has an unsupported morph-target declaration.`);
  for (const [targetIndex, target] of (primitive.targets ?? []).entries()) {
    if (!target || typeof target !== 'object' || Array.isArray(target)) throw new Error(`${label} has an unsupported morph-target declaration.`);
    for (const [semantic, index] of Object.entries(target)) add(targetIndex, semantic, index);
  }
  return specs;
}

function normalizedBarycentric(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || Math.abs(total) < mouthGeometryEpsilon) throw new Error('Mouth seam intersection produced an invalid barycentric coordinate.');
  return values.map(value => value / total);
}

function clipPoint(a, b, t) {
  return {
    u: a.u + (b.u - a.u) * t,
    v: a.v + (b.v - a.v) * t,
    bary: normalizedBarycentric(a.bary.map((value, index) => value + (b.bary[index] - value) * t)),
  };
}

function dedupeMouthPolygon(points) {
  const output = [];
  for (const point of points) {
    const prior = output.at(-1);
    if (!prior || point.bary.some((value, index) => Math.abs(value - prior.bary[index]) > mouthGeometryEpsilon)) output.push(point);
  }
  if (output.length > 1) {
    const first = output[0], last = output.at(-1);
    if (first.bary.every((value, index) => Math.abs(value - last.bary[index]) <= mouthGeometryEpsilon)) output.pop();
  }
  return output;
}

function clipMouthPolygon(points, coordinate, boundary, keepLess, inclusive = true) {
  const output = [];
  if (!points.length) return output;
  const inside = value => keepLess ? (inclusive ? value <= boundary : value < boundary) : (inclusive ? value >= boundary : value > boundary);
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index + points.length - 1) % points.length];
    const current = points[index];
    const previousInside = inside(previous[coordinate]), currentInside = inside(current[coordinate]);
    if (currentInside !== previousInside) {
      const denominator = current[coordinate] - previous[coordinate];
      if (Math.abs(denominator) < mouthGeometryEpsilon) throw new Error(`Mouth seam clipping encountered a zero-length ${coordinate} boundary edge.`);
      const t = Math.max(0, Math.min(1, (boundary - previous[coordinate]) / denominator));
      output.push(clipPoint(previous, current, t));
    }
    if (currentInside) output.push(current);
  }
  return dedupeMouthPolygon(output);
}

function mouthPolygonArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index], next = points[(index + 1) % points.length];
    // UVs can collapse to a line or point on valid eye geometry. Measure the
    // retained fraction of the source triangle, not its texture-space area.
    area += current.bary[1] * next.bary[2] - next.bary[1] * current.bary[2];
  }
  return Math.abs(area) / 2;
}

function triangulateMouthPolygon(points) {
  const polygon = dedupeMouthPolygon(points);
  if (polygon.length < 3 || mouthPolygonArea(polygon) <= mouthGeometryEpsilon) return [];
  const triangles = [];
  for (let index = 1; index < polygon.length - 1; index += 1) {
    const triangle = [polygon[0], polygon[index], polygon[index + 1]];
    if (mouthPolygonArea(triangle) > mouthGeometryEpsilon) triangles.push(triangle);
  }
  return triangles;
}

function mouthRegionsForTriangle(triangle, rule) {
  const xBoundary = Number(rule.xLessEqual), yBoundary = Number(rule.yLessEqual);
  if (!Number.isFinite(xBoundary) || !Number.isFinite(yBoundary)) throw new Error('Mouth shader UV rule has non-finite clipping thresholds.');
  if (typeof rule.glbVInverted !== 'boolean') throw new Error('Mouth shader UV rule has no explicit GLB V orientation for source-exact clipping.');
  const vBoundary = rule.glbVInverted ? 1 - yBoundary : yBoundary;
  const vKeepLess = !rule.glbVInverted;
  const left = clipMouthPolygon(triangle, 'u', xBoundary, true);
  const mouth = clipMouthPolygon(left, 'v', vBoundary, vKeepLess);
  const right = clipMouthPolygon(triangle, 'u', xBoundary, false, false);
  const eyeLeft = clipMouthPolygon(left, 'v', vBoundary, !vKeepLess, false);
  return {
    mouth: triangulateMouthPolygon(mouth),
    eye: [...triangulateMouthPolygon(right), ...triangulateMouthPolygon(eyeLeft)],
  };
}

function analyzeMouthPrimitive(primitive, rule, label) {
  if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error(`${label} uses primitive mode ${primitive.mode}; topology-safe mouth clipping supports TRIANGLES only.`);
  if (!Number.isInteger(primitive.indices)) throw new Error(`${label} is non-indexed; topology-safe mouth clipping requires indexed TRIANGLES.`);
  const uvIndex = primitive.attributes?.TEXCOORD_0;
  if (!Number.isInteger(uvIndex)) throw new Error(`${label} has no exact TEXCOORD_0 accessor for source-exact mouth clipping.`);
  const uv = mouthAccessor(uvIndex, 'TEXCOORD_0', label);
  if (!uv || uv.type !== 'VEC2' || uv.components !== 2) throw new Error(`${label} has no VEC2 TEXCOORD_0 accessor for source-exact mouth clipping.`);
  if (uv.values.some(value => value.some(component => !Number.isFinite(component)))) throw new Error(`${label} has non-finite TEXCOORD_0 values.`);
  const indices = mouthIndices(primitive.indices, label);
  const triangles = [];
  let crossing = false;
  for (let index = 0; index < indices.length; index += 3) {
    const sourceIndices = indices.slice(index, index + 3);
    if (sourceIndices.some(vertex => vertex >= uv.values.length)) throw new Error(`${label} references a TEXCOORD_0 vertex outside its accessor.`);
    const points = sourceIndices.map((vertex, corner) => ({ u: uv.values[vertex][0], v: uv.values[vertex][1], bary: [0, 0, 0].map((_, item) => item === corner ? 1 : 0) }));
    const regions = mouthRegionsForTriangle(points, rule);
    const mouthArea = regions.mouth.reduce((sum, item) => sum + mouthPolygonArea(item), 0);
    const eyeArea = regions.eye.reduce((sum, item) => sum + mouthPolygonArea(item), 0);
    if (mouthArea > mouthGeometryEpsilon && eyeArea > mouthGeometryEpsilon) crossing = true;
    triangles.push({ sourceIndices, points, mouth: regions.mouth, eye: regions.eye, mouthArea, eyeArea });
  }
  return {
    uv,
    specs: crossing ? mouthAttributeSpecs(primitive, label) : [uv],
    targetCount: Array.isArray(primitive.targets) ? primitive.targets.length : 0,
    triangles,
    crossing,
  };
}

function createMouthBuilder(specs, targetCount = 0) {
  return {
    indices: [],
    attributes: Object.fromEntries(specs.filter(spec => spec.targetIndex === null).map(spec => [spec.semantic, []])),
    targets: Array.from({ length: targetCount }, () => ({})),
    vertexCount: 0,
    specs,
  };
}

function interpolateMouthVector(spec, bary, sourceIndices, label) {
  const values = sourceIndices.map(index => spec.values[index]);
  if (values.some(value => !value || value.length !== spec.components)) throw new Error(`${label} has an invalid ${spec.semantic} vertex attribute at a seam.`);
  const result = Array.from({ length: spec.components }, (_, component) => values.reduce((sum, value, index) => sum + value[component] * bary[index], 0));
  if (result.some(value => !Number.isFinite(value))) throw new Error(`${label} has a non-finite interpolated ${spec.semantic} vertex attribute.`);
  return result;
}

function interpolateMouthVertex(specs, bary, sourceIndices, label) {
  const result = new Map();
  const baseSpecs = specs.filter(spec => spec.targetIndex === null);
  for (const spec of specs) {
    if (result.has(spec.key)) continue;
    const jointMatch = spec.targetIndex === null && spec.semantic.match(/^JOINTS_(\d+)$/);
    if (jointMatch) {
      const joints = sourceIndices.map(index => spec.values[index]);
      if (joints.some(value => !value || value.length !== spec.components)) throw new Error(`${label} has an invalid ${spec.semantic} vertex attribute at a seam.`);
      const weight = baseSpecs.find(item => item.semantic === `WEIGHTS_${jointMatch[1]}`);
      if (!weight) {
        const activeValues = joints.filter((_, index) => bary[index] !== 0);
        if (!activeValues.length || !activeValues.every(value => value.every((item, index) => item === activeValues[0][index]))) {
          throw new Error(`${label} requires a WEIGHTS_${jointMatch[1]} accessor to interpolate JOINTS_${jointMatch[1]} at a seam.`);
        }
        result.set(spec.key, [...activeValues[0]]);
        continue;
      }
      if (weight.components !== spec.components) throw new Error(`${label} has mismatched JOINTS_${jointMatch[1]} and WEIGHTS_${jointMatch[1]} component counts.`);
      const weights = sourceIndices.map(index => weight.values[index]);
      if (weights.some(value => !value || value.length !== weight.components)) throw new Error(`${label} has an invalid WEIGHTS_${jointMatch[1]} vertex attribute at a seam.`);
      const merged = new Map();
      for (let corner = 0; corner < sourceIndices.length; corner += 1) {
        for (let component = 0; component < joints[corner].length; component += 1) {
          const amount = weights[corner][component] * bary[corner];
          if (!Number.isFinite(amount)) throw new Error(`${label} has a non-finite skin weight at a seam.`);
          const mergedWeight = (merged.get(joints[corner][component]) ?? 0) + amount;
          if (!Number.isFinite(mergedWeight)) throw new Error(`${label} has a non-finite merged skin weight at a seam.`);
          merged.set(joints[corner][component], mergedWeight);
        }
      }
      const influences = [...merged.entries()].filter(([, amount]) => amount !== 0)
        .sort(([leftJoint, leftWeight], [rightJoint, rightWeight]) => rightWeight - leftWeight || leftJoint - rightJoint);
      if (influences.length > spec.components) throw new Error(`${label} seam interpolation needs ${influences.length} joint influences, exceeding the ${spec.components}-slot source skinning accessor.`);
      const jointValues = Array(spec.components).fill(0), weightValues = Array(weight.components).fill(0);
      influences.forEach(([joint, amount], index) => { jointValues[index] = joint; weightValues[index] = amount; });
      result.set(spec.key, jointValues);
      result.set(weight.key, weightValues);
      continue;
    }
    if (spec.targetIndex === null && spec.semantic.match(/^WEIGHTS_(\d+)$/) && baseSpecs.some(item => item.semantic === `JOINTS_${spec.semantic.match(/^WEIGHTS_(\d+)$/)[1]}`)) continue;
    result.set(spec.key, interpolateMouthVector(spec, bary, sourceIndices, label));
  }
  return result;
}

function appendMouthTriangle(builder, triangle, sourceIndices, label) {
  const barycentricValues = triangle.map(point => point.bary);
  for (let index = 0; index < triangle.length; index += 1) {
    const values = interpolateMouthVertex(builder.specs, barycentricValues[index], sourceIndices, label);
    const vertexIndex = builder.vertexCount;
    builder.vertexCount += 1;
    builder.indices.push(vertexIndex);
    for (const spec of builder.specs) {
      const target = spec.targetIndex === null ? builder.attributes : (builder.targets[spec.targetIndex] ??= {});
      (target[spec.semantic] ??= []).push(values.get(spec.key));
    }
  }
}

function buildClippedMouthPrimitive(analysis, label) {
  if (!analysis.crossing) return null;
  const eye = createMouthBuilder(analysis.specs, analysis.targetCount), mouth = createMouthBuilder(analysis.specs, analysis.targetCount);
  for (const triangle of analysis.triangles) {
    for (const polygon of triangle.eye) appendMouthTriangle(eye, polygon, triangle.sourceIndices, label);
    for (const polygon of triangle.mouth) appendMouthTriangle(mouth, polygon, triangle.sourceIndices, label);
  }
  return { eye, mouth };
}

function appendMouthAttribute(values, spec, label) {
  if (/^JOINTS_\d+$/.test(spec.semantic) && spec.targetIndex === null) {
    if (![5121, 5123, 5125].includes(spec.componentType)) throw new Error(`${label} uses unsupported JOINTS component type ${spec.componentType}.`);
    const bytesPerComponent = spec.componentType === 5121 ? 1 : spec.componentType === 5123 ? 2 : 4;
    const bytes = Buffer.alloc(values.length * spec.components * bytesPerComponent);
    const max = spec.componentType === 5121 ? 255 : spec.componentType === 5123 ? 65535 : 4294967295;
    values.flat().forEach((value, index) => {
      if (!Number.isInteger(value) || value < 0 || value > max) throw new Error(`${label} produced an invalid interpolated JOINTS value.`);
      if (spec.componentType === 5121) bytes.writeUInt8(value, index);
      else if (spec.componentType === 5123) bytes.writeUInt16LE(value, index * 2);
      else bytes.writeUInt32LE(value, index * 4);
    });
    return json.accessors.push({ bufferView: appendView(bytes), componentType: spec.componentType, count: values.length, type: spec.type }) - 1;
  }
  return appendAccessor(values, spec.type, spec.components);
}

function materializeMouthBuilder(original, builder, material, label) {
  if (!builder.indices.length) return null;
  const attributes = {};
  for (const spec of builder.specs.filter(item => item.targetIndex === null)) attributes[spec.semantic] = appendMouthAttribute(builder.attributes[spec.semantic], spec, label);
  const targets = builder.targets.map((target, targetIndex) => Object.fromEntries(builder.specs
    .filter(spec => spec.targetIndex === targetIndex).map(spec => [spec.semantic, appendMouthAttribute(target[spec.semantic], spec, label)])));
  const output = { ...original, attributes, indices: appendIndices(builder.indices) };
  if (original.targets) output.targets = targets;
  if (material !== undefined) output.material = material;
  return output;
}

function deleteMouthVertexColor(builder) {
  delete builder.attributes.COLOR_0;
  builder.specs = builder.specs.filter(spec => !(spec.targetIndex === null && spec.semantic === 'COLOR_0'));
}

function transformMouthUV(builder, transform) {
  if (!builder.attributes.TEXCOORD_0) return;
  builder.attributes.TEXCOORD_0 = builder.attributes.TEXCOORD_0.map(value => transform(value));
}

function sourceMouthIndices(analysis, kind) {
  return analysis.triangles.flatMap(triangle => triangle[kind === 'mouth' ? 'mouthArea' : 'eyeArea'] > mouthGeometryEpsilon ? triangle.sourceIndices : []);
}

function hasPureEyeGeometryOnAnotherSlot(profile, mouth, targetSlot) {
  const mouthRendererKey = sourceReferenceKey(mouth.sourceRendererReference);
  for (const renderer of profile.renderers ?? []) {
    const rendererKey = sourceReferenceKey(renderer.sourceReference);
    const node = json.nodes?.[renderer.glbNodeIndex];
    const mesh = node && json.meshes?.[node.mesh];
    if (!mesh) continue;
    for (const slot of renderer.materialSlots ?? []) {
      if (slot === targetSlot || slot.adapterId !== 'mx-character-eyemouth' || !slot.glb?.primitiveIndices?.length) continue;
      if (rendererKey === mouthRendererKey && slot.slot === mouth.materialSlot) continue;
      for (const primitiveIndex of slot.glb.primitiveIndices) {
        const primitive = mesh.primitives?.[primitiveIndex];
        const uvIndex = primitive?.attributes?.TEXCOORD_0;
        if (!Number.isInteger(uvIndex) || !Number.isInteger(primitive.indices)) continue;
        const uv = readAccessor(uvIndex), indices = readAccessor(primitive.indices).flat();
        let eyeTriangles = 0, mouthTriangles = 0, seamTriangles = 0;
        for (let index = 0; index < indices.length; index += 3) {
          const triangle = indices.slice(index, index + 3);
          if (triangle.length !== 3 || triangle.some(vertex => !uv[vertex])) { seamTriangles += 1; continue; }
          const mask = triangle.map(vertex => uv[vertex][0] <= mouth.shaderUvRule.xLessEqual
            && uv[vertex][1] >= 1 - mouth.shaderUvRule.yLessEqual);
          if (mask.every(Boolean)) mouthTriangles += 1;
          else if (mask.some(Boolean)) seamTriangles += 1;
          else eyeTriangles += 1;
        }
        if (eyeTriangles > 0 && mouthTriangles === 0 && seamTriangles === 0) return true;
      }
    }
  }
  return false;
}

function splitProfileMouth(profile, texturePath) {
  if (!profile.mouth) {
    if (texturePath) throw new Error('A mouth atlas was exported without an exact source mouth binding.');
    return;
  }
  if (!texturePath || !fs.existsSync(texturePath)) throw new Error('The exact source mouth atlas was not exported.');
  const mouth = profile.mouth;
  const renderer = profile.renderers.find(item => sourceReferenceKey(item.sourceReference) === sourceReferenceKey(mouth.sourceRendererReference));
  const slot = renderer?.materialSlots.find(item => item.slot === mouth.materialSlot);
  const node = renderer && json.nodes?.[renderer.glbNodeIndex];
  const mesh = node && json.meshes?.[node.mesh];
  if (!renderer || !slot?.glb || !mesh) throw new Error('Mouth binding does not resolve to one GLB renderer/material slot.');
  const imageIndex = json.images.push({ name: `${slot.sourceMaterialName ?? 'chibi'}_MouthAtlas`, mimeType: 'image/png', bufferView: appendView(fs.readFileSync(texturePath)) }) - 1;
  json.samplers ??= [];
  const samplerIndex = json.samplers.push({ magFilter: 9729, minFilter: 9729, wrapS: 10497, wrapT: 10497 }) - 1;
  json.textures ??= [];
  const textureIndex = json.textures.push({ source: imageIndex, sampler: samplerIndex }) - 1;
  const scale = mouth.textureTransform.scale;
  const defaultColumn = mouth.defaultTile % 100, defaultRow = Math.floor(mouth.defaultTile / 100);
  const tint = slot.adapterSettings.mouthTint ?? [1, 1, 1, 1];
  const mouthTiles = {};
  for (const event of mouth.events) (mouthTiles[event.clip] ??= []).push([event.time, event.tile, event.flipX]);
  const materialIndex = json.materials.push({
    name: `${slot.sourceMaterialName ?? 'chibi'}#MouthAtlas`,
    alphaMode: slot.renderState.alphaMode,
    ...(slot.renderState.alphaMode === 'MASK' ? { alphaCutoff: Number(slot.materialProperties.floats?._Cutoff) || 0.5 } : {}),
    doubleSided: slot.renderState.doubleSided ?? false,
    pbrMetallicRoughness: {
      baseColorTexture: { index: textureIndex, texCoord: 0, extensions: { KHR_texture_transform: {
        offset: [defaultColumn / mouth.columns, 1 - scale.y - defaultRow / mouth.rows], scale: [scale.x, scale.y],
      } } },
      baseColorFactor: tint, metallicFactor: 0, roughnessFactor: 1,
    },
    extras: { mouthTiles, mouthAtlas: { columns: mouth.columns, rows: mouth.rows, defaultTile: mouth.defaultTile, scaleX: scale.x, scaleY: scale.y }, chibi: {
      depthWrite: slot.renderState.depthWrite,
      depthTest: slot.renderState.depthTest,
      depthFunction: slot.renderState.depthFunction,
      cullMode: slot.renderState.cullMode,
      drawLayer: slot.renderState.layer,
      renderOrder: (slot.renderState.layer === 'transparent' ? 10000 : 0) + Math.max(0, profile.drawSequence.indexOf(sourceReferenceKey(renderer.sourceReference))) + 1,
      mouthProfileBinding: { sourceRendererReference: mouth.sourceRendererReference, materialSlot: mouth.materialSlot },
      sourceMaterialReference: slot.sourceMaterialReference,
      sourceShaderReference: slot.sourceShaderReference,
    } },
  }) - 1;
  const eyePrimitiveIndices = [], mouthPrimitiveIndices = [];
  let mouthTriangleCount = 0;
  const originalPrimitiveIndices = [...slot.glb.primitiveIndices];
  const splitData = [];
  for (const primitiveIndex of originalPrimitiveIndices) {
    const primitive = mesh.primitives[primitiveIndex];
    const label = `Mouth source primitive ${primitiveIndex}`;
    const analysis = analyzeMouthPrimitive(primitive, mouth.shaderUvRule, label);
    splitData.push({ primitiveIndex, primitive, analysis });
  }
  for (const { primitiveIndex, primitive, analysis } of splitData) {
    if (analysis.crossing) {
      const clipped = buildClippedMouthPrimitive(analysis, `Mouth source primitive ${primitiveIndex}`);
      const eyePrimitive = materializeMouthBuilder(primitive, clipped.eye, primitive.material, `Mouth source primitive ${primitiveIndex}`);
      const mouthPrimitive = materializeMouthBuilder(primitive, clipped.mouth, materialIndex, `Mouth source primitive ${primitiveIndex}`);
      if (!eyePrimitive || !mouthPrimitive) throw new Error(`Mouth source primitive ${primitiveIndex} did not produce both eye and mouth topology after seam clipping.`);
      primitive.attributes = eyePrimitive.attributes;
      primitive.indices = eyePrimitive.indices;
      if (primitive.targets) primitive.targets = eyePrimitive.targets;
      eyePrimitiveIndices.push(primitiveIndex);
      mesh.primitives.push(mouthPrimitive);
      mouthPrimitiveIndices.push(mesh.primitives.length - 1);
      mouthTriangleCount += clipped.mouth.indices.length / 3;
      continue;
    }
    const eyes = sourceMouthIndices(analysis, 'eye'), mouthIndices = sourceMouthIndices(analysis, 'mouth');
    if (!eyes.length && !mouthIndices.length) throw new Error(`Mouth split for source primitive ${primitiveIndex} is empty.`);
    if (eyes.length && mouthIndices.length) {
      primitive.indices = appendIndices(eyes);
      eyePrimitiveIndices.push(primitiveIndex);
      mesh.primitives.push({ ...primitive, indices: appendIndices(mouthIndices), material: materialIndex });
      mouthPrimitiveIndices.push(mesh.primitives.length - 1);
    } else if (mouthIndices.length) {
      primitive.material = materialIndex;
      mouthPrimitiveIndices.push(primitiveIndex);
    } else {
      eyePrimitiveIndices.push(primitiveIndex);
    }
    mouthTriangleCount += mouthIndices.length / 3;
  }
  if (!mouthTriangleCount) throw new Error('Verified EyeMouth material slot has no mouth geometry.');
  const hasEyeGeometry = eyePrimitiveIndices.length > 0
    || hasPureEyeGeometryOnAnotherSlot(profile, mouth, slot);
  if (!hasEyeGeometry) throw new Error('Verified EyeMouth material slots have no eye geometry.');
  const slotPrimitiveIndices = eyePrimitiveIndices.length ? eyePrimitiveIndices : mouthPrimitiveIndices;
  slot.glb.primitiveIndices = slotPrimitiveIndices;
  slot.glb.materialIndices = slotPrimitiveIndices.map(index => mesh.primitives[index].material);
  slot.glb.materialIndex = slot.glb.materialIndices[0];
  mouth.glbPrimitiveIndices = { eyes: eyePrimitiveIndices, mouth: mouthPrimitiveIndices };
  mouth.glbMaterialIndex = materialIndex;
  profile.validation = {
    ...profile.validation,
    valid: true,
    unresolved: [],
    excludedRenderers: profile.excludedRenderers ?? [],
    excludedChildRendererEvents: profile.excludedChildRendererEvents ?? [],
  };
  const scene = json.scenes?.[Number.isInteger(json.scene) ? json.scene : 0];
  if (!scene) throw new Error('Rendering profile cannot be embedded because the GLB has no selected scene.');
  scene.extras = { ...scene.extras, chibi: { ...scene.extras?.chibi, renderingProfile: profile } };
}

if (config.renderingProfile) {
  splitProfileMouth(config.renderingProfile, config.mouthTexturePath);
  const scene = json.scenes?.[Number.isInteger(json.scene) ? json.scene : 0];
  if (!scene) throw new Error('Rendering profile cannot be embedded because the GLB has no selected scene.');
  scene.extras = { ...scene.extras, chibi: { ...scene.extras?.chibi, renderingProfile: config.renderingProfile } };
  json.extensionsUsed ??= [];
  if (config.renderingProfile.mouth && !json.extensionsUsed.includes('KHR_texture_transform')) json.extensionsUsed.push('KHR_texture_transform');
} else if (config.mouthTexturePath) {
const sourceAtlas = config.mouthAtlas;
const mouthTransform = sourceAtlas ? {
  offset: [(sourceAtlas.defaultTile % 100) / sourceAtlas.columns, 1 - sourceAtlas.scaleY - Math.floor(sourceAtlas.defaultTile / 100) / sourceAtlas.rows],
  scale: [sourceAtlas.scaleX, sourceAtlas.scaleY],
} : null;
if (mouthTransform) {
  json.extensionsUsed ??= [];
  if (!json.extensionsUsed.includes('KHR_texture_transform')) json.extensionsUsed.push('KHR_texture_transform');
}
// Source-driven imports keep the original UVs and use the same atlas transform
// as the exact-profile path. Legacy standalone callers retain their baked UVs.
const mouthUV = ([u, v]) => sourceAtlas ? [u, v] : [u * .5 + (config.mouthDefaultTile ?? 704) % 100 / 8, v * .5 + .5 - Math.floor((config.mouthDefaultTile ?? 704) / 100) / 8];
const mouthImage = json.images.push({ name: 'Character_Mouth', mimeType: 'image/png', bufferView: appendView(fs.readFileSync(config.mouthTexturePath)) }) - 1;
json.samplers ??= [];
const mouthSampler = json.samplers.push({ magFilter: 9729, minFilter: 9729, wrapS: 10497, wrapT: 10497 }) - 1;
const mouthTexture = json.textures.push({ source: mouthImage, sampler: mouthSampler }) - 1;
const mouthMaterial = json.materials.push({
  name: config.mouthMaterialName ?? `${config.sourceIdentity}_Mouth`, alphaMode: 'BLEND',
  pbrMetallicRoughness: { baseColorTexture: { index: mouthTexture, ...(mouthTransform ? { extensions: { KHR_texture_transform: mouthTransform } } : {}) }, metallicFactor: 0, roughnessFactor: 1 },
  extensions: { KHR_materials_unlit: {} },
  // SetMouthTile AnimationEvents from the original Unity clips: row * 100 + column.
  extras: { chibi: { depthWrite: false, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }, mouthTiles: config.mouthTiles ?? {
    Haruna_Original_Cafe_Idle: [[0, 704]],
    Haruna_Original_Cafe_Walk: [[0, 704]],
    Haruna_Original_Cafe_Reaction: [[0, 704], [0.3000000119, 707], [1.2333334684, 300], [1.26666677, 704]],
    Haruna_Original_Formation_Pickup: [[0, 704], [0.4333333671, 501], [1.4333333969, 704], [2.1666667461, 404]],
  }, mouthAtlas: sourceAtlas ?? { columns: 8, rows: 8, defaultTile: config.mouthDefaultTile ?? 704 } },
}) - 1;
let mouthTriangles = 0;
const eyeMouthMaterialNames = new Set([
  ...(config.eyeMouthMaterialNames ?? ['Haruna_Original_EyeMouth']),
  ...(json.materials ?? []).map(material => material.name).filter(name => /EyeMouth|EyeMoutn/i.test(name ?? '')),
]);
for (const mesh of json.meshes) {
  for (const primitive of [...mesh.primitives]) {
    const materialName = json.materials[primitive.material]?.name;
    if (!eyeMouthMaterialNames.has(materialName)) continue;
    const label = `Legacy mouth primitive ${json.meshes.indexOf(mesh)}:${mesh.primitives.indexOf(primitive)}`;
    const analysis = analyzeMouthPrimitive(primitive, { xLessEqual: .25, yLessEqual: .25, glbVInverted: true }, label);
    const sourceUv = analysis.uv.values;
    const eyeMaterial = json.materials[primitive.material];
    // The legacy `EyeMoutn` export is source-opaque and depth-tested. It still
    // needs mouth extraction, but must not inherit the transparent late-layer
    // metadata used by the correctly-spelled EyeMouth sprite materials.
    if (/EyeMoutn/i.test(materialName ?? '') && !/EyeMouth/i.test(materialName ?? '')) {
      eyeMaterial.alphaMode = 'OPAQUE';
      delete eyeMaterial.alphaCutoff;
      if (eyeMaterial.extras && typeof eyeMaterial.extras === 'object') {
        const { chibi: _ignored, ...extras } = eyeMaterial.extras;
        eyeMaterial.extras = extras;
      }
    } else {
      eyeMaterial.alphaMode = 'MASK';
      eyeMaterial.alphaCutoff = 0.5;
      eyeMaterial.extras = {
        ...eyeMaterial.extras,
        chibi: {
          ...eyeMaterial.extras?.chibi,
          depthWrite: false,
          depthTest: false,
          renderOrder: 20,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        },
      };
    }
    if (analysis.crossing) {
      const clipped = buildClippedMouthPrimitive(analysis, label);
      deleteMouthVertexColor(clipped.eye);
      deleteMouthVertexColor(clipped.mouth);
      if (flipEyeMouthV.has(materialName) || flipEyeMouthU.has(materialName)) {
        transformMouthUV(clipped.eye, ([u, v]) => [flipEyeMouthU.has(materialName) ? 1 - u : u, flipEyeMouthV.has(materialName) ? 1 - v : v]);
      }
      transformMouthUV(clipped.mouth, mouthUV);
      const eyePrimitive = materializeMouthBuilder(primitive, clipped.eye, primitive.material, label);
      const mouthPrimitive = materializeMouthBuilder(primitive, clipped.mouth, mouthMaterial, label);
      if (!eyePrimitive || !mouthPrimitive) throw new Error(`${label} did not produce both eye and mouth topology after seam clipping.`);
      primitive.attributes = eyePrimitive.attributes;
      primitive.indices = eyePrimitive.indices;
      if (primitive.targets) primitive.targets = eyePrimitive.targets;
      mesh.primitives.push(mouthPrimitive);
      mouthTriangles += clipped.mouth.indices.length / 3;
      continue;
    }
    const mouth = sourceMouthIndices(analysis, 'mouth'), eyes = sourceMouthIndices(analysis, 'eye');
    mouthTriangles += mouth.length / 3;
    if (!eyes.length && !mouth.length) throw new Error(`${label} is empty after source UV classification.`);
    primitive.indices = appendIndices(eyes);
    if (flipEyeMouthV.has(materialName) || flipEyeMouthU.has(materialName)) {
      primitive.attributes = { ...primitive.attributes, TEXCOORD_0: appendAccessor(sourceUv.map(([u, v]) => [flipEyeMouthU.has(materialName) ? 1 - u : u, flipEyeMouthV.has(materialName) ? 1 - v : v]), 'VEC2', 2) };
    }
    // MX/C-EyesMouth does not read Unity vertex color. FBX2glTF exports the
    // unused channel anyway, and multiplying it in glTF corrupts the face.
    delete primitive.attributes.COLOR_0;
    const attributes = { ...primitive.attributes, TEXCOORD_0: appendAccessor(sourceUv.map(mouthUV), 'VEC2', 2) };
    delete attributes.COLOR_0;
    mesh.primitives.push({ ...primitive, attributes, indices: appendIndices(mouth), material: mouthMaterial });
  }
}
// A GLTF mesh renders its grouped primitives in array order. Keep opaque face
// geometry first so the late EyeMouth/Mouth sprite layers cannot be overwritten
// when both are exported into the same mesh (Yuzu Armed is one such source).
for (const mesh of json.meshes) {
  const opaque = [], eyes = [], mouths = [];
  for (const primitive of mesh.primitives) {
    const name = json.materials[primitive.material]?.name ?? '';
    if (eyeMouthMaterialNames.has(name)) eyes.push(primitive);
    else if (primitive.material === mouthMaterial) mouths.push(primitive);
    else opaque.push(primitive);
  }
  mesh.primitives = [...opaque, ...eyes, ...mouths];
}
if (!mouthTriangles && !config.incompleteImport) throw new Error('Eye/mouth shader material has no mouth geometry');
if (config.expectedMouthTriangles && mouthTriangles !== config.expectedMouthTriangles) throw new Error(`Unexpected mouth geometry: ${mouthTriangles} triangles`);
}

if (config.incompleteImport) applyIncompleteMaterials(json, config, appendView, nodeHierarchyPaths());
if (config.incompleteImport) embedAlternateFaceEvents(json, config, nodeHierarchyPaths(), readAccessor);
embedRendererActive(json, config, nodeHierarchyPaths());
embedExCostumePreview(json);
const rootRotationRepairs = restoreRootRotations(json, config.rootRotations ?? [], nodeHierarchyPaths(), readAccessor, appendAccessor);
const staticMeshRepairs = restoreStaticMeshTranslations(json, config.haloFollow?.staticMeshTranslations ?? [], nodeHierarchyPaths(), readAccessor, appendAccessor);
if (staticMeshRepairs) console.log(`Restored ${staticMeshRepairs} source-static mesh position tracks`);
  if (rootRotationRepairs) console.log(`Restored ${rootRotationRepairs} exact source bone transform tracks`);
if (config.incompleteImport) {
  for (const choice of inferInactiveAlternateHair(json, config.incompleteImport.renderers, nodeHierarchyPaths(), config.exportClips, readAccessor)) {
    const index = nodeHierarchyPaths().indexOf(choice.hierarchyPath);
    const node = json.nodes[index];
    node.extras.chibi.inferredInitialVisible = false;
    json.scenes[json.scene ?? 0].extras.chibi.incompleteImport.warnings.push(`Inferred inactive alternate hair ${choice.hierarchyPath}: ${choice.influenced}/${choice.vertices} vertices use joints absent from every selected clip; numeric renderer targets remain unresolved.`);
  }
}

// MX/C-Face uses vertex alpha for its rim mask, never RGB as tint.
// Keep alpha, but prevent glTF from multiplying mask RGB into the face.
for (const mesh of json.meshes ?? []) {
  for (const primitive of mesh.primitives ?? []) {
    if (json.materials[primitive.material]?.extras?.chibi?.adapterId !== 'mx-character-face'
      || !Number.isInteger(primitive.attributes?.COLOR_0)) continue;
    const accessor = json.accessors[primitive.attributes.COLOR_0];
    const colors = readAccessor(primitive.attributes.COLOR_0).map(row => [1, 1, 1,
      row.length === 4 ? normalizedAccessorComponent(row[3], accessor.componentType, accessor.normalized) : 1]);
    primitive.attributes.COLOR_0 = appendAccessor(colors, 'VEC4', 4);
  }
}
const skinSkeletonRepairs = repairNonAncestorSkinSkeletons();
if (skinSkeletonRepairs.length) console.log(`Repaired ${skinSkeletonRepairs.length} non-ancestor skin.skeleton root(s)`);
const joints = new Set((json.skins ?? []).flatMap((skin) => skin.joints ?? []));
for (const animation of json.animations) {
  const cameraClip = /_Cam$/i.test(animation.name ?? '');
  const hasMovingJoint = animation.channels.some((channel) => {
    if (!joints.has(channel.target.node) && !cameraClip) return false;
    const sampler = animation.samplers[channel.sampler];
    const values = readAccessor(sampler.output);
    const keyframes = sampler.interpolation === "CUBICSPLINE"
      ? values.filter((_, index) => index % 3 === 1)
      : values;
    return keyframes.some((value, index) =>
      index > 0 && value.some((component, componentIndex) =>
        Math.abs(component - keyframes[0][componentIndex]) > 1e-6,
      ),
    );
  });
  if (!hasMovingJoint && !config.incompleteImport) throw new Error(`Animation has no changing skeletal channel: ${animation.name}`);
}

const visibleMeshes = (json.nodes ?? [])
  .filter((node) => node.mesh !== undefined)
  .map((node) => node.name);
if (visibleMeshes.some((name) => removedMeshNames.has(name))) {
  throw new Error("Accessory mesh removal failed");
}

if (config.haloFollow) {
  const scene = json.scenes[json.scene ?? 0];
  scene.extras = { ...scene.extras, chibi: { ...scene.extras?.chibi, haloFollow: bindHaloFollow(json, config.haloFollow) } };
}

const finalBinPadding = (4 - (bin.length % 4)) % 4;
if (finalBinPadding) bin = Buffer.concat([bin, Buffer.alloc(finalBinPadding)]);
json.buffers[0].byteLength = bin.length;
const jsonBytes = Buffer.from(JSON.stringify(json));
const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)]);
const totalLength = 12 + 8 + paddedJson.length + 8 + bin.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(totalLength, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(paddedJson.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(bin.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);

fs.writeFileSync(outputPath, Buffer.concat([header, jsonHeader, paddedJson, binHeader, bin]));
console.log(`Wrote ${outputPath}`);
console.log(`Animations: ${json.animations.map((animation) => animation.name).join(", ")}`);
console.log(`Visible meshes: ${visibleMeshes.join(", ")}`);
