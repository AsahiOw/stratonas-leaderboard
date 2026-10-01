import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { parseV12GlbBytes, type V12Glb } from './chibi-v12-motion-glb'
import { createBodyIsolatedReviewArtifact, type BodyRoleReviewPins, type SourceReference } from './chibi-v12-body-role-review'

const sourcePrefab: SourceReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'prefab.cab', objectId: '100' }
const sourceRenderer: SourceReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'prefab.cab', objectId: '200' }
const sourceMesh: SourceReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'mesh.cab', objectId: '300' }
const otherRenderer: SourceReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'prefab.cab', objectId: '201' }
const otherMesh: SourceReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'mesh.cab', objectId: '301' }
const rootTransform: SourceReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'prefab.cab', objectId: '101' }
const bodyTransform: SourceReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'prefab.cab', objectId: '102' }
const bone: SourceReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'prefab.cab', objectId: '103' }

const pins: BodyRoleReviewPins = {
  studentId: 42,
  sourceIdentity: 'fixture',
  expectedGlbSha256: '0'.repeat(64),
  prefabPath: 'Assets/Fixture.prefab',
  assemblyRoot: 'FixtureRoot',
  prefabReference: sourcePrefab,
  rendererReference: sourceRenderer,
  meshReference: sourceMesh,
  rendererTransformChain: [rootTransform, bodyTransform],
  hierarchyPath: 'FixtureRoot/Body',
  rendererType: 'SkinnedMeshRenderer',
  targetNodeIndex: 1,
  targetMeshIndex: 0,
  targetSkinIndex: 0,
  profileRendererNodeIndices: [1, 2],
  meshNodeIndices: [1, 2],
  primitiveMaterialIndices: [0],
  skinJointCount: 1,
  sourceBoneReferenceCount: 1,
}

function fixtureGlb(): V12Glb {
  const binary = Buffer.alloc(64)
  const positionOffset = 0
  const jointsOffset = 24
  const weightsOffset = 32
  ;[0, 0, 0, 0, 2, 0].forEach((value, index) => binary.writeFloatLE(value, positionOffset + index * 4))
  binary.fill(0, jointsOffset, jointsOffset + 8)
  ;[1, 0, 0, 0, 1, 0, 0, 0].forEach((value, index) => binary.writeFloatLE(value, weightsOffset + index * 4))

  const profileRenderer = (reference: SourceReference, meshReference: SourceReference, glbNodeIndex: number, path: string) => ({
    sourceReference: reference,
    sourceMesh: { sourceReference: meshReference },
    rendererType: glbNodeIndex === 1 ? 'SkinnedMeshRenderer' : 'MeshRenderer',
    defaultVisible: true,
    hierarchyPath: path,
    glbNodeIndex,
    materialSlots: glbNodeIndex === 1 ? [{ slot: 0, glb: { nodeIndex: 1, meshIndex: 0, primitiveIndices: [0], materialIndices: [0] } }] : [],
  })
  const nodeProvenance = (renderer: SourceReference, mesh: SourceReference) => ({ extras: { chibi: { sourceRenderer: { sourceReference: renderer, sourceMeshReference: mesh } } } })
  const gltf = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0], extras: { chibi: { renderingProfile: {
      sourceIdentity: 'fixture',
      sourcePrefab: { path: 'Assets/Fixture.prefab', reference: sourcePrefab },
      assembly: {
        root: 'FixtureRoot',
        prefabReference: sourcePrefab,
        renderers: [{
          sourceReference: sourceRenderer,
          meshSourceReference: sourceMesh,
          transformChain: [{ sourceReference: rootTransform }, { sourceReference: bodyTransform }],
          boneReferences: [{ sourceReference: bone }],
        }],
      },
      renderers: [
        profileRenderer(sourceRenderer, sourceMesh, 1, 'FixtureRoot/Body'),
        profileRenderer(otherRenderer, otherMesh, 2, 'FixtureRoot/Decoration'),
      ],
    } } } }],
    nodes: [
      { name: 'Root', children: [1, 2, 3] },
      { name: 'Body', mesh: 0, skin: 0, ...nodeProvenance(sourceRenderer, sourceMesh) },
      { name: 'Other', mesh: 1, ...nodeProvenance(otherRenderer, otherMesh) },
      { name: 'Joint' },
    ],
    meshes: [
      { primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 }, material: 0 }] },
      { primitives: [{ attributes: { POSITION: 0 }, material: 0 }] },
    ],
    skins: [{ joints: [3], skeleton: 3 }],
    materials: [{ name: 'retained' }],
    animations: [{ name: 'retained-animation', samplers: [], channels: [] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: positionOffset, byteLength: 24 },
      { buffer: 0, byteOffset: jointsOffset, byteLength: 8 },
      { buffer: 0, byteOffset: weightsOffset, byteLength: 32 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 2, type: 'VEC3' },
      { bufferView: 1, componentType: 5121, count: 2, type: 'VEC4' },
      { bufferView: 2, componentType: 5126, count: 2, type: 'VEC4' },
    ],
  }
  const bytes = encodeGlb(gltf, binary)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  return parseV12GlbBytes(bytes, sha256)
}

function encodeGlb(gltf: Record<string, any>, binary: Buffer) {
  const sourceJson = Buffer.from(JSON.stringify(gltf), 'utf8')
  const jsonLength = (sourceJson.length + 3) & ~3
  const json = Buffer.alloc(jsonLength, 0x20)
  sourceJson.copy(json)
  const totalLength = 12 + 8 + json.length + 8 + binary.length
  const bytes = Buffer.alloc(totalLength)
  bytes.write('glTF', 0, 'ascii')
  bytes.writeUInt32LE(2, 4)
  bytes.writeUInt32LE(totalLength, 8)
  bytes.writeUInt32LE(json.length, 12)
  bytes.writeUInt32LE(0x4e4f534a, 16)
  json.copy(bytes, 20)
  const binOffset = 20 + json.length
  bytes.writeUInt32LE(binary.length, binOffset)
  bytes.writeUInt32LE(0x004e4942, binOffset + 4)
  binary.copy(bytes, binOffset + 8)
  return bytes
}

function freshPins(glb: V12Glb): BodyRoleReviewPins {
  return { ...pins, expectedGlbSha256: glb.sha256 }
}

test('isolated body GLB changes only non-target mesh/skin bindings and preserves binary, hierarchy, and animations', () => {
  const glb = fixtureGlb()
  const before = JSON.parse(JSON.stringify(glb.gltf))
  const artifact = createBodyIsolatedReviewArtifact(glb, freshPins(glb))
  assert.deepEqual(glb.gltf, before, 'Source GLTF object was mutated.')
  assert.deepEqual(glb.bytes, fixtureGlb().bytes, 'Pinned source GLB bytes were changed.')
  assert.deepEqual(artifact.receipt.hiddenMeshNodes, [{
    nodeIndex: 2,
    meshIndex: 1,
    skinIndex: null,
    sourceRendererReference: otherRenderer,
    sourceMeshReference: otherMesh,
  }])
  assert.equal(artifact.receipt.roleConclusion, 'candidate GLB body renderer isolated for lead visual review only; this does not prove source geometry or skin parity')
  assert.equal(artifact.receipt.screenshots.fullModel, null)
  assert.equal(artifact.receipt.bindPoseHeight.height, 2)

  const outputSha = createHash('sha256').update(artifact.bytes).digest('hex')
  const output = parseV12GlbBytes(artifact.bytes, outputSha)
  assert.deepEqual(output.binary, glb.binary)
  assert.deepEqual(output.gltf.nodes.map((node: Record<string, unknown>) => node.mesh === undefined ? null : node.mesh), [null, 0, null, null])
  assert.deepEqual(output.gltf.nodes[1], glb.gltf.nodes[1])
  assert.deepEqual(output.gltf.nodes[0].children, glb.gltf.nodes[0].children)
  assert.deepEqual(output.gltf.animations, glb.gltf.animations)
  assert.deepEqual(output.gltf.materials, glb.gltf.materials)
  assert.equal(output.gltf.nodes[2].skin, undefined)
  const restored = JSON.parse(JSON.stringify(output.gltf))
  for (const hidden of artifact.receipt.hiddenMeshNodes) {
    restored.nodes[hidden.nodeIndex].mesh = glb.gltf.nodes[hidden.nodeIndex].mesh
    if (glb.gltf.nodes[hidden.nodeIndex].skin === undefined) delete restored.nodes[hidden.nodeIndex].skin
    else restored.nodes[hidden.nodeIndex].skin = glb.gltf.nodes[hidden.nodeIndex].skin
  }
  assert.deepEqual(restored, glb.gltf, 'Isolation altered GLTF JSON beyond non-target mesh/skin references.')
})

test('review fails closed when exact body renderer source mesh provenance differs', () => {
  const glb = fixtureGlb()
  const forged = JSON.parse(JSON.stringify(glb.gltf))
  forged.nodes[1].extras.chibi.sourceRenderer.sourceMeshReference.objectId = '999'
  const altered = reparsedFromFixture(forged, glb.binary)
  assert.throws(() => createBodyIsolatedReviewArtifact(altered, freshPins(altered)), /mesh provenance differs from its pinned source identity/)
})

test('review fails closed on duplicate exact profile renderer identity', () => {
  const glb = fixtureGlb()
  const forged = JSON.parse(JSON.stringify(glb.gltf))
  const duplicate = JSON.parse(JSON.stringify(forged.scenes[0].extras.chibi.renderingProfile.renderers[0]))
  duplicate.glbNodeIndex = 2
  forged.scenes[0].extras.chibi.renderingProfile.renderers[1] = duplicate
  const altered = reparsedFromFixture(forged, glb.binary)
  assert.throws(() => createBodyIsolatedReviewArtifact(altered, freshPins(altered)), /repeats a renderer source identity/)
})

test('review fails closed when a mesh-bearing node is absent from the frozen renderer roster', () => {
  const glb = fixtureGlb()
  const forged = JSON.parse(JSON.stringify(glb.gltf))
  forged.nodes[3].mesh = 1
  const altered = reparsedFromFixture(forged, glb.binary)
  assert.throws(() => createBodyIsolatedReviewArtifact(altered, freshPins(altered)), /Visible GLB mesh-node set differs from the pinned renderer set/)
})

test('review fails closed when the exact source-bound body node is not reachable from the default scene', () => {
  const glb = fixtureGlb()
  const forged = JSON.parse(JSON.stringify(glb.gltf))
  forged.scenes[0].nodes = [2]
  const altered = reparsedFromFixture(forged, glb.binary)
  assert.throws(() => createBodyIsolatedReviewArtifact(altered, freshPins(altered)), /not reachable exactly once from the default scene/)
})

function reparsedFromFixture(gltf: Record<string, any>, binary: Buffer) {
  const bytes = encodeGlb(gltf, binary)
  return parseV12GlbBytes(bytes, createHash('sha256').update(bytes).digest('hex'))
}
