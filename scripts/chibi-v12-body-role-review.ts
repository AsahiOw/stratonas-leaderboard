import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { measureBindPoseBodyHeight, parseV12GlbBytes, type V12Glb } from './chibi-v12-motion-glb'

type JsonRecord = Record<string, any>

export type SourceReference = {
  bundleSha256: string
  serializedFile: string
  objectId: string
}

export type BodyRoleReviewPins = {
  studentId: number
  sourceIdentity: string
  expectedGlbSha256: string
  prefabPath: string
  assemblyRoot: string
  prefabReference: SourceReference
  rendererReference: SourceReference
  meshReference: SourceReference
  rendererTransformChain: readonly SourceReference[]
  hierarchyPath: string
  rendererType: 'SkinnedMeshRenderer'
  targetNodeIndex: number
  targetMeshIndex: number
  targetSkinIndex: number
  profileRendererNodeIndices: readonly number[]
  meshNodeIndices: readonly number[]
  primitiveMaterialIndices: readonly number[]
  skinJointCount: number
  sourceBoneReferenceCount: number
  sourceJointSetMappingSha256?: string
  sourceJointSetEvidence?: {
    file: string
    fileSha256: string
    reportSha256: string
  }
}

export const HANAE_BODY_ROLE_REVIEW_PINS: BodyRoleReviewPins = {
  studentId: 23002,
  sourceIdentity: 'hanae_original',
  expectedGlbSha256: 'a6b416cf1f9a7b3dfcd257ca92c511ea7d2180f87f394aa1a54d5608b2787288',
  prefabPath: 'Assets/_MX/AddressableAsset/Character/Hanae_Original/Cafe/Cafe_Hanae_Original.prefab',
  assemblyRoot: 'Cafe_Hanae_Original',
  prefabReference: {
    bundleSha256: '8a9307591bfecc1fea86afecd6da3221faa70bd2155dcc9a8fe22e9fc0c24091',
    serializedFile: 'CAB-9c2efe680107dc25690dea8d82e7706c',
    objectId: '4236591853074573121',
  },
  rendererReference: {
    bundleSha256: '8a9307591bfecc1fea86afecd6da3221faa70bd2155dcc9a8fe22e9fc0c24091',
    serializedFile: 'CAB-9c2efe680107dc25690dea8d82e7706c',
    objectId: '4488741340594890561',
  },
  meshReference: {
    bundleSha256: '786d93e199a8863c53e044fefcf2ff776a0315f7649d60f597b63f0141732291',
    serializedFile: 'CAB-fffe4e1c760e4a52588ee5ed888f7144',
    objectId: '-1516806847989328844',
  },
  rendererTransformChain: [
    {
      bundleSha256: '8a9307591bfecc1fea86afecd6da3221faa70bd2155dcc9a8fe22e9fc0c24091',
      serializedFile: 'CAB-9c2efe680107dc25690dea8d82e7706c',
      objectId: '-6061973070595430591',
    },
    {
      bundleSha256: '8a9307591bfecc1fea86afecd6da3221faa70bd2155dcc9a8fe22e9fc0c24091',
      serializedFile: 'CAB-9c2efe680107dc25690dea8d82e7706c',
      objectId: '-2697347826073671871',
    },
  ],
  hierarchyPath: 'Cafe_Hanae_Original/Hanae_Original_Body',
  rendererType: 'SkinnedMeshRenderer',
  targetNodeIndex: 191,
  targetMeshIndex: 3,
  targetSkinIndex: 3,
  profileRendererNodeIndices: [179, 180, 181, 191, 192, 194],
  meshNodeIndices: [179, 180, 181, 191, 192, 194],
  primitiveMaterialIndices: [1, 2, 3, 5, 4, 10],
  skinJointCount: 101,
  sourceBoneReferenceCount: 101,
  sourceJointSetMappingSha256: 'bbcabfd3433fa6f5ce20d189bf67002e7de418eacdb50dcf22ec75b8321886bb',
  sourceJointSetEvidence: {
    file: 'docs/chibi-v12-hanae-geometry-diagnostics-v2-20260926.json',
    fileSha256: 'e22fa91332d365b788e112ade6a1cd8089c2a458fe7a9e872f1cb8088096b78a',
    reportSha256: '0ae6f2fccfee5227ad24c5dbf4e357bcba7a24a15b1271ab84cd6e8f3e994f83',
  },
}

export type IsolatedBodyReviewArtifact = {
  bytes: Buffer
  receipt: JsonRecord
}

/**
 * Build a disposable GLB that leaves one exact source-bound renderer visible.
 * This proves only the role and height denominator of the immutable GLB node;
 * it does not establish source mesh or per-vertex skin correspondence.
 */
export function createBodyIsolatedReviewArtifact(
  source: V12Glb,
  pins: BodyRoleReviewPins,
): IsolatedBodyReviewArtifact {
  const verifiedSource = parseV12GlbBytes(source.bytes, pins.expectedGlbSha256)
  assert.equal(source.sha256, verifiedSource.sha256, 'Supplied GLB checksum does not match its bytes.')
  assert.deepEqual(source.binary, verifiedSource.binary, 'Supplied GLB BIN chunk does not match the pinned bytes.')
  const original = JSON.parse(JSON.stringify(verifiedSource.gltf)) as JsonRecord
  const sceneIndex = Number.isInteger(original.scene) ? original.scene : 0
  const scene = original.scenes?.[sceneIndex]
  assert.ok(scene && typeof scene === 'object' && !Array.isArray(scene), 'Pinned GLB default scene is missing.')
  const profile = scene.extras?.chibi?.renderingProfile
  assert.ok(profile && typeof profile === 'object' && !Array.isArray(profile), 'Pinned GLB scene has no embedded rendering profile.')
  assert.equal(profile.sourceIdentity, pins.sourceIdentity, 'Embedded source identity differs from the pinned review identity.')
  assert.equal(profile.sourcePrefab?.path, pins.prefabPath, 'Embedded source prefab path differs from the pinned review prefab.')
  assertReference(profile.sourcePrefab?.reference, pins.prefabReference, 'Embedded source prefab')
  assert.equal(profile.assembly?.root, pins.assemblyRoot, 'Embedded assembly root differs from the pinned review root.')
  assertReference(profile.assembly?.prefabReference, pins.prefabReference, 'Embedded assembly prefab')

  const profileRenderers = requireArray(profile.renderers, 'Embedded rendering-profile renderers')
  assert.equal(profileRenderers.length, pins.profileRendererNodeIndices.length, 'Embedded renderer count differs from the pinned roster.')
  const profileNodeIndices: number[] = []
  const profileReferenceKeys = new Set<string>()
  for (const [index, renderer] of profileRenderers.entries()) {
    const reference = requireReference(renderer?.sourceReference, `Profile renderer ${index} source reference`)
    const key = sourceReferenceKey(reference)
    assert.ok(!profileReferenceKeys.has(key), 'Embedded rendering profile repeats a renderer source identity.')
    profileReferenceKeys.add(key)
    const nodeIndex = renderer.glbNodeIndex
    assert.ok(Number.isInteger(nodeIndex) && nodeIndex >= 0 && nodeIndex < original.nodes?.length, `Profile renderer ${index} has an invalid GLB node index.`)
    profileNodeIndices.push(nodeIndex)
    const meshReference = requireProfileMeshReference(renderer, `Profile renderer ${index}`)
    const nodeSource = original.nodes[nodeIndex]?.extras?.chibi?.sourceRenderer
    assertReference(nodeSource?.sourceReference, reference, `GLB node ${nodeIndex} renderer provenance`)
    assertReference(nodeSource?.sourceMeshReference, meshReference, `GLB node ${nodeIndex} mesh provenance`)
  }
  assert.deepEqual(sortedNumbers(profileNodeIndices), sortedNumbers(pins.profileRendererNodeIndices), 'Profile renderer node set differs from the pinned renderer set.')
  const meshNodeIndices: number[] = original.nodes.flatMap((node: JsonRecord, index: number) => node?.mesh === undefined ? [] : [index])
  assert.deepEqual(sortedNumbers(meshNodeIndices), sortedNumbers(pins.meshNodeIndices), 'Visible GLB mesh-node set differs from the pinned renderer set.')
  assert.ok(meshNodeIndices.includes(pins.targetNodeIndex), 'Pinned body renderer node is not a rendered mesh node.')

  const rendererRows = profileRenderers.filter((renderer: JsonRecord) => sameReference(renderer.sourceReference, pins.rendererReference))
  assert.equal(rendererRows.length, 1, 'Pinned renderer reference does not select exactly one rendering-profile row.')
  const renderer = rendererRows[0]
  assertReference(requireProfileMeshReference(renderer, 'Pinned profile renderer'), pins.meshReference, 'Pinned profile renderer mesh')
  assert.equal(renderer.rendererType, pins.rendererType, 'Pinned profile renderer type differs from the expected core-body type.')
  assert.equal(renderer.defaultVisible, true, 'Pinned profile body renderer is not visible by default.')
  assert.equal(renderer.hierarchyPath, pins.hierarchyPath, 'Pinned profile hierarchy path differs from the expected source path.')
  assert.equal(renderer.glbNodeIndex, pins.targetNodeIndex, 'Pinned profile renderer maps to a different GLB node.')

  const assemblyRenderers = requireArray(profile.assembly?.renderers, 'Embedded assembly renderers')
  const assemblyRows = assemblyRenderers.filter((candidate: JsonRecord) => sameReference(candidate.sourceReference, pins.rendererReference))
  assert.equal(assemblyRows.length, 1, 'Pinned renderer reference does not select exactly one assembly row.')
  const assemblyRenderer = assemblyRows[0]
  assertReference(assemblyRenderer.meshSourceReference, pins.meshReference, 'Pinned assembly renderer mesh')
  const transformChain = requireArray(assemblyRenderer.transformChain, 'Pinned assembly renderer transform chain')
  assert.equal(transformChain.length, pins.rendererTransformChain.length, 'Pinned renderer transform-chain length differs.')
  for (const [index, expected] of pins.rendererTransformChain.entries()) {
    assertReference(transformChain[index]?.sourceReference, expected, `Pinned renderer transform-chain entry ${index}`)
  }
  const boneReferences = requireArray(assemblyRenderer.boneReferences, 'Pinned source renderer bone references')
  assert.equal(boneReferences.length, pins.sourceBoneReferenceCount, 'Pinned source renderer bone-reference count differs.')
  const boneKeys = boneReferences.map((bone: JsonRecord, index: number) => sourceReferenceKey(requireReference(bone?.sourceReference, `Source bone reference ${index}`)))
  assert.equal(new Set(boneKeys).size, boneKeys.length, 'Pinned source renderer bone references contain duplicates.')

  const bodyNode = original.nodes[pins.targetNodeIndex]
  assertReference(bodyNode?.extras?.chibi?.sourceRenderer?.sourceReference, pins.rendererReference, 'Pinned GLB body node renderer')
  assertReference(bodyNode?.extras?.chibi?.sourceRenderer?.sourceMeshReference, pins.meshReference, 'Pinned GLB body node mesh')
  assert.equal(bodyNode.mesh, pins.targetMeshIndex, 'Pinned body node mesh index differs.')
  assert.equal(bodyNode.skin, pins.targetSkinIndex, 'Pinned body node skin index differs.')
  const bodyMesh = original.meshes?.[pins.targetMeshIndex]
  const primitives = requireArray(bodyMesh?.primitives, 'Pinned body mesh primitives')
  const primitiveMaterialIndices = primitives.map((primitive: JsonRecord, index: number) => {
    assert.ok(Number.isInteger(primitive.material), `Pinned body primitive ${index} has no material binding.`)
    return primitive.material as number
  })
  assert.deepEqual(primitiveMaterialIndices, [...pins.primitiveMaterialIndices], 'Pinned body primitive material sequence differs.')
  const profileSlots = requireArray(renderer.materialSlots, 'Pinned profile renderer material slots').map((slot: JsonRecord, index: number) => {
    assert.equal(slot.glb?.nodeIndex, pins.targetNodeIndex, `Material slot ${index} maps to another node.`)
    assert.equal(slot.glb?.meshIndex, pins.targetMeshIndex, `Material slot ${index} maps to another mesh.`)
    return { slot: slot.slot, primitiveIndices: [...requireArray(slot.glb?.primitiveIndices, `Material slot ${index} primitive indices`)] }
  })
  const skin = original.skins?.[pins.targetSkinIndex]
  const jointNodeIndices = requireArray(skin?.joints, 'Pinned body skin joints')
  assert.equal(jointNodeIndices.length, pins.skinJointCount, 'Pinned GLB skin joint count differs.')
  assert.equal(new Set(jointNodeIndices).size, jointNodeIndices.length, 'Pinned GLB skin repeats a joint node.')
  for (const [index, jointNodeIndex] of jointNodeIndices.entries()) {
    assert.ok(Number.isInteger(jointNodeIndex) && original.nodes[jointNodeIndex], `Pinned body skin joint ${index} has an invalid node index.`)
  }

  const ancestryNodeIndices = pathFromSceneRoot(original, sceneIndex, pins.targetNodeIndex)
  const bindPoseHeight = measureBindPoseBodyHeight(verifiedSource, [pins.targetNodeIndex])
  const isolated = JSON.parse(JSON.stringify(original)) as JsonRecord
  const hiddenMeshNodes = meshNodeIndices.filter(index => index !== pins.targetNodeIndex).map(index => {
    const node = isolated.nodes[index]
    const chibiSource = node.extras?.chibi?.sourceRenderer
    const hidden = {
      nodeIndex: index,
      meshIndex: node.mesh,
      skinIndex: node.skin ?? null,
      sourceRendererReference: chibiSource?.sourceReference ?? null,
      sourceMeshReference: chibiSource?.sourceMeshReference ?? null,
    }
    delete node.mesh
    delete node.skin
    return hidden
  })
  assert.deepEqual(
    isolated.nodes[pins.targetNodeIndex],
    original.nodes[pins.targetNodeIndex],
    'Isolation changed the selected body node.',
  )
  const isolatedBytes = serializeGlb(isolated, verifiedSource.binary)
  const isolatedSha256 = createHash('sha256').update(isolatedBytes).digest('hex')
  const reparsed = parseV12GlbBytes(isolatedBytes, isolatedSha256)
  assert.deepEqual(reparsed.binary, verifiedSource.binary, 'Isolation changed the embedded GLB BIN bytes.')
  assert.deepEqual(
    reparsed.gltf.nodes.flatMap((node: JsonRecord, index: number) => node?.mesh === undefined ? [] : [index]),
    [pins.targetNodeIndex],
    'Isolated GLB does not contain exactly one rendered mesh node.',
  )

  return {
    bytes: isolatedBytes,
    receipt: {
      schemaVersion: 1,
      kind: 'chibi-v12-isolated-body-role-review',
      status: 'pending-lead-visual-review',
      studentId: pins.studentId,
      sourceIdentity: pins.sourceIdentity,
      originalGlb: { sha256: verifiedSource.sha256, bytes: verifiedSource.bytes.length },
      isolatedGlb: { sha256: isolatedSha256, bytes: isolatedBytes.length },
      exactEmbeddedBinding: {
        sourcePrefabReference: pins.prefabReference,
        sourceRendererReference: pins.rendererReference,
        sourceMeshReference: pins.meshReference,
        sourceTransformChain: pins.rendererTransformChain,
        sourceHierarchyPath: pins.hierarchyPath,
        sourceRendererType: pins.rendererType,
        glbNodeIndex: pins.targetNodeIndex,
        glbMeshIndex: pins.targetMeshIndex,
        glbSkinIndex: pins.targetSkinIndex,
      },
      selectedGlbNode: {
        ancestryNodeIndices,
        ancestryNamesAreLabelsOnly: ancestryNodeIndices.map((index: number) => original.nodes[index]?.name ?? null),
        translation: bodyNode.translation ?? [0, 0, 0],
        rotation: bodyNode.rotation ?? [0, 0, 0, 1],
        scale: bodyNode.scale ?? [1, 1, 1],
      },
      mesh: {
        primitiveCount: primitives.length,
        primitiveMaterialIndices,
        sourceMaterialSlotBindings: profileSlots,
        profileDoesNotBindEveryPrimitive: profileSlots.flatMap((slot: JsonRecord) => slot.primitiveIndices).length !== primitives.length,
      },
      skin: {
        skinIndex: pins.targetSkinIndex,
        skeletonNodeIndex: skin.skeleton ?? null,
        inverseBindMatricesAccessorIndex: skin.inverseBindMatrices ?? null,
        glbJointNodeIndices: jointNodeIndices,
        glbJointNodeCount: jointNodeIndices.length,
        sourceBoneReferenceCount: boneReferences.length,
        externalUnverifiedJointSetEvidencePins: pins.sourceJointSetMappingSha256 && pins.sourceJointSetEvidence ? {
          mappingSha256: pins.sourceJointSetMappingSha256,
          evidenceFile: pins.sourceJointSetEvidence.file,
          evidenceFileSha256: pins.sourceJointSetEvidence.fileSha256,
          evidenceReportSha256: pins.sourceJointSetEvidence.reportSha256,
          verification: 'not-read-or-verified-by-this-helper',
        } : null,
        status: 'per-vertex source-to-GLB skin correspondence is unproven; prior joint-set evidence pins are external and unverified here',
      },
      bindPoseHeight: {
        ...bindPoseHeight,
        nodeIndices: [pins.targetNodeIndex],
        method: 'measureBindPoseBodyHeight from the pinned immutable GLB skinned vertices',
        units: 'GLB model-space units',
      },
      hiddenMeshNodes,
      changeSummary: {
        changedNodeFields: ['mesh', 'skin'],
        selectedNodeUnchanged: true,
        materialsTexturesAnimationsHierarchyAccessorsAndBinaryRetained: true,
      },
      roleConclusion: 'candidate GLB body renderer isolated for lead visual review only; this does not prove source geometry or skin parity',
      screenshots: { fullModel: null, isolatedRenderer: null },
    },
  }
}

function assertReference(actual: unknown, expected: SourceReference, label: string) {
  const reference = requireReference(actual, label)
  assert.deepEqual(
    { bundleSha256: reference.bundleSha256, serializedFile: reference.serializedFile, objectId: reference.objectId },
    { bundleSha256: expected.bundleSha256, serializedFile: expected.serializedFile, objectId: expected.objectId },
    `${label} differs from its pinned source identity.`,
  )
}

function sameReference(actual: unknown, expected: SourceReference) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false
  const reference = actual as JsonRecord
  return reference.bundleSha256 === expected.bundleSha256
    && reference.serializedFile === expected.serializedFile
    && reference.objectId === expected.objectId
}

function requireReference(value: unknown, label: string): SourceReference {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} is missing.`)
  const reference = value as JsonRecord
  assert.match(reference.bundleSha256, /^[a-f0-9]{64}$/i, `${label} has an invalid bundle digest.`)
  assert.ok(typeof reference.serializedFile === 'string' && reference.serializedFile.length > 0, `${label} has no serialized-file identity.`)
  assert.ok(typeof reference.objectId === 'string' && /^-?\d+$/.test(reference.objectId), `${label} has no exact object identity.`)
  return { bundleSha256: reference.bundleSha256, serializedFile: reference.serializedFile, objectId: reference.objectId }
}

function sourceReferenceKey(reference: SourceReference) {
  return `${reference.bundleSha256.toLowerCase()}\u0000${reference.serializedFile}\u0000${reference.objectId}`
}

function requireProfileMeshReference(renderer: JsonRecord, label: string): SourceReference {
  const reference = renderer?.sourceMesh?.sourceReference ?? renderer?.sourceMeshReference
  return requireReference(reference, `${label} mesh source reference`)
}

function requireArray(value: unknown, label: string): any[] {
  assert.ok(Array.isArray(value), `${label} must be an array.`)
  return value
}

function sortedNumbers(values: readonly number[]) {
  return [...values].sort((left, right) => left - right)
}

function pathFromSceneRoot(gltf: JsonRecord, sceneIndex: number, targetNodeIndex: number) {
  const parents: Array<number | null> = Array.from({ length: gltf.nodes.length }, () => null)
  for (const [parentIndex, parent] of gltf.nodes.entries()) {
    for (const childIndex of parent.children ?? []) {
      assert.ok(Number.isInteger(childIndex) && gltf.nodes[childIndex], `GLB node ${parentIndex} has an invalid child index.`)
      assert.equal(parents[childIndex], null, `GLB node ${childIndex} has more than one parent.`)
      parents[childIndex] = parentIndex
    }
  }
  const sceneRoots = requireArray(gltf.scenes[sceneIndex].nodes, 'Pinned GLB scene roots')
  const paths: number[][] = []
  const visit = (nodeIndex: number, path: number[]) => {
    assert.ok(!path.includes(nodeIndex), `GLB node hierarchy contains a cycle at node ${nodeIndex}.`)
    const next = [...path, nodeIndex]
    if (nodeIndex === targetNodeIndex) paths.push(next)
    for (const childIndex of gltf.nodes[nodeIndex].children ?? []) visit(childIndex, next)
  }
  for (const rootIndex of sceneRoots) visit(rootIndex, [])
  assert.equal(paths.length, 1, 'Pinned body node is not reachable exactly once from the default scene.')
  return paths[0]
}

function serializeGlb(gltf: JsonRecord, binary: Buffer) {
  assert.ok(binary.length % 4 === 0, 'Pinned GLB BIN chunk is not four-byte aligned.')
  assert.equal(gltf.buffers?.length, 1, 'Pinned review GLB must have exactly one embedded buffer.')
  assert.equal(gltf.buffers[0].uri, undefined, 'Pinned review GLB buffer must not be external.')
  const jsonBytes = Buffer.from(JSON.stringify(gltf), 'utf8')
  const jsonLength = (jsonBytes.length + 3) & ~3
  const jsonChunk = Buffer.alloc(jsonLength, 0x20)
  jsonBytes.copy(jsonChunk)
  const totalLength = 12 + 8 + jsonChunk.length + 8 + binary.length
  const result = Buffer.alloc(totalLength)
  result.write('glTF', 0, 'ascii')
  result.writeUInt32LE(2, 4)
  result.writeUInt32LE(totalLength, 8)
  result.writeUInt32LE(jsonChunk.length, 12)
  result.writeUInt32LE(0x4e4f534a, 16)
  jsonChunk.copy(result, 20)
  const binaryHeader = 20 + jsonChunk.length
  result.writeUInt32LE(binary.length, binaryHeader)
  result.writeUInt32LE(0x004e4942, binaryHeader + 4)
  binary.copy(result, binaryHeader + 8)
  return result
}
