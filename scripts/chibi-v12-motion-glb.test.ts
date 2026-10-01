import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { measureBindPoseBodyHeight, parseV12GlbBytes, readNodeBaseTrs, sampleAnimationAtTimes, type V12Glb } from './chibi-v12-motion-glb'

type AccessorFixture = { type: 'SCALAR' | 'VEC3' | 'VEC4' | 'MAT4'; componentType: 5121 | 5126; count: number; values: number[] }

function packAccessors(fixtures: readonly AccessorFixture[]) {
  const chunks: Buffer[] = []
  const accessors: Record<string, unknown>[] = []
  const bufferViews: Record<string, unknown>[] = []
  let byteOffset = 0
  for (const fixture of fixtures) {
    const components = fixture.type === 'SCALAR' ? 1 : fixture.type === 'VEC3' ? 3 : fixture.type === 'VEC4' ? 4 : 16
    const componentBytes = fixture.componentType === 5126 ? 4 : 1
    assert.equal(fixture.values.length, fixture.count * components)
    const padding = (4 - (byteOffset % 4)) % 4
    if (padding) {
      chunks.push(Buffer.alloc(padding))
      byteOffset += padding
    }
    const bytes = Buffer.alloc(fixture.values.length * componentBytes)
    fixture.values.forEach((value, index) => {
      if (fixture.componentType === 5126) bytes.writeFloatLE(value, index * 4)
      else bytes.writeUInt8(value, index)
    })
    const index = accessors.length
    bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.length })
    accessors.push({ bufferView: index, componentType: fixture.componentType, count: fixture.count, type: fixture.type })
    chunks.push(bytes)
    byteOffset += bytes.length
  }
  return { accessors, bufferViews, binary: Buffer.concat(chunks) }
}

function animationGlb(path: 'translation' | 'rotation', interpolation = 'LINEAR'): V12Glb {
  const outputType = path === 'rotation' ? 'VEC4' : 'VEC3'
  const outputs = path === 'rotation' ? [0, 0, 0, 1, 0, 0, 0, -1] : [0, 0, 0, 2, 4, 6]
  const packed = packAccessors([
    { type: 'SCALAR', componentType: 5126, count: 2, values: [0, 1] },
    { type: outputType, componentType: 5126, count: 2, values: outputs },
  ])
  return {
    bytes: Buffer.alloc(0),
    sha256: 'a'.repeat(64),
    binary: packed.binary,
    gltf: {
      nodes: [{ translation: [10, 20, 30], rotation: [0, 0, 0, 1], scale: [2, 3, 4] }],
      accessors: packed.accessors,
      bufferViews: packed.bufferViews,
      animations: [{ samplers: [{ input: 0, output: 1, interpolation }], channels: [{ sampler: 0, target: { node: 0, path } }] }],
    },
  }
}

function skinGlb(weights: number[], indices?: number[]): V12Glb {
  const accessors: AccessorFixture[] = [
    { type: 'VEC3', componentType: 5126, count: 2, values: [0, 0, 0, 0, 2, 0] },
    { type: 'VEC4', componentType: 5121, count: 2, values: [0, 0, 0, 0, 0, 0, 0, 0] },
    { type: 'VEC4', componentType: 5126, count: 2, values: weights },
  ]
  if (indices) accessors.push({ type: 'SCALAR', componentType: 5121, count: indices.length, values: indices })
  const packed = packAccessors(accessors)
  const reference = { bundleSha256: 'b'.repeat(64), serializedFile: 'characters.ab', objectId: '123' }
  return {
    bytes: Buffer.alloc(0),
    sha256: 'c'.repeat(64),
    binary: packed.binary,
    gltf: {
      nodes: [
        { name: 'joint' },
        { mesh: 0, skin: 0, extras: { chibi: { sourceRenderer: { sourceReference: reference, sourceMeshReference: { ...reference, objectId: '456' } } } } },
      ],
      skins: [{ joints: [0] }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 }, ...(indices ? { indices: 3 } : {}) }] }],
      accessors: packed.accessors,
      bufferViews: packed.bufferViews,
    },
  }
}

function transformedSkinGlb(): V12Glb {
  const packed = packAccessors([
    { type: 'VEC3', componentType: 5126, count: 2, values: [0, 1, 0, 0, 3, 0] },
    { type: 'VEC4', componentType: 5121, count: 2, values: [0, 0, 0, 0, 0, 0, 0, 0] },
    { type: 'VEC4', componentType: 5126, count: 2, values: [1, 0, 0, 0, 1, 0, 0, 0] },
    { type: 'MAT4', componentType: 5126, count: 1, values: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -5, 0, 1] },
  ])
  const reference = { bundleSha256: 'd'.repeat(64), serializedFile: 'characters.ab', objectId: '123' }
  const sourceRenderer = (objectId: string) => ({
    sourceReference: { ...reference, objectId },
    sourceMeshReference: { ...reference, objectId: `mesh-${objectId}` },
  })
  return {
    bytes: Buffer.alloc(0),
    sha256: 'e'.repeat(64),
    binary: packed.binary,
    gltf: {
      nodes: [
        { translation: [0, 5, 0], children: [1] },
        { translation: [0, 2, 0] },
        { translation: [0, 100, 0], mesh: 0, skin: 0, extras: { chibi: { sourceRenderer: sourceRenderer('456') } } },
        { translation: [0, -200, 0], mesh: 0, skin: 0, extras: { chibi: { sourceRenderer: sourceRenderer('789') } } },
      ],
      skins: [{ joints: [1], skeleton: 0, inverseBindMatrices: 3 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 } }] }],
      accessors: packed.accessors,
      bufferViews: packed.bufferViews,
    },
  }
}

function minimalGlb() {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, buffers: [{ byteLength: 4 }] }), 'utf8')
  const jsonLength = (json.length + 3) & ~3
  const totalLength = 12 + 8 + jsonLength + 8 + 4
  const bytes = Buffer.alloc(totalLength, 0x20)
  bytes.write('glTF', 0, 'ascii')
  bytes.writeUInt32LE(2, 4)
  bytes.writeUInt32LE(totalLength, 8)
  bytes.writeUInt32LE(jsonLength, 12)
  bytes.writeUInt32LE(0x4e4f534a, 16)
  json.copy(bytes, 20)
  const binHeader = 20 + jsonLength
  bytes.writeUInt32LE(4, binHeader)
  bytes.writeUInt32LE(0x004e4942, binHeader + 4)
  bytes.fill(0, binHeader + 8, binHeader + 12)
  return bytes
}

test('immutable GLB parsing checks the expected whole-file hash and retains the embedded BIN', () => {
  const bytes = minimalGlb()
  const digest = createHash('sha256').update(bytes).digest('hex')
  const parsed = parseV12GlbBytes(bytes, digest)
  assert.equal(parsed.sha256, digest)
  assert.equal(parsed.binary.length, 4)
  assert.throws(() => parseV12GlbBytes(bytes, '0'.repeat(64)), /differ from the immutable v12 checksum/)
})

test('animation samples use node defaults for absent channels and linearly sample authored TRS', () => {
  const samples = sampleAnimationAtTimes(animationGlb('translation'), { animationIndex: 0, nodeIndex: 0, times: [-1, 0.5, 2] })
  assert.deepEqual(samples.map(sample => sample.translation), [[0, 0, 0], [1, 2, 3], [2, 4, 6]])
  assert.deepEqual(samples[1].rotation, [0, 0, 0, 1])
  assert.deepEqual(samples[1].scale, [2, 3, 4])
  assert.deepEqual(samples.map(sample => sample.time), [-1, 0.5, 2])
})

test('base TRS uses the normalized node quaternion, independently of animation samples', () => {
  const rawHanaeRotation = [1.48433565785866e-13, 0.00000137507538511272, -0.495772778987885, 0.868452310562134]
  const withoutRotationChannel = animationGlb('translation')
  withoutRotationChannel.gltf.nodes[0].rotation = rawHanaeRotation
  const base = readNodeBaseTrs(withoutRotationChannel, 0)
  assert.ok(base)
  const norm = Math.hypot(...rawHanaeRotation)
  assert.deepEqual(base.rotation, rawHanaeRotation.map(value => value / norm))
  assert.deepEqual(sampleAnimationAtTimes(withoutRotationChannel, { animationIndex: 0, nodeIndex: 0, times: [0.5] })[0].rotation, base.rotation)

  const animated = animationGlb('rotation')
  animated.gltf.nodes[0].rotation = rawHanaeRotation
  const animatedBase = readNodeBaseTrs(animated, 0)
  assert.ok(animatedBase)
  const animatedSample = sampleAnimationAtTimes(animated, { animationIndex: 0, nodeIndex: 0, times: [0.5] })[0]
  assert.deepEqual(animatedSample.rotation, [0, 0, 0, 1])
  assert.notDeepEqual(animatedSample.rotation, animatedBase.rotation, 'An animated sample must never be substituted for the node base TRS.')
})

test('base TRS rejects missing, malformed, zero-quaternion, and matrix-authored nodes', () => {
  const glb = animationGlb('translation')
  assert.equal(readNodeBaseTrs(glb, 1), null)
  glb.gltf.nodes[0].rotation = [0, 0, 0, 0]
  assert.equal(readNodeBaseTrs(glb, 0), null)
  glb.gltf.nodes[0].rotation = [0, 0, 0, 1]
  glb.gltf.nodes[0].translation = [0, Number.NaN, 0]
  assert.equal(readNodeBaseTrs(glb, 0), null)
  glb.gltf.nodes[0].translation = [0, 0, 0]
  glb.gltf.nodes[0].matrix = Array(16).fill(0)
  assert.equal(readNodeBaseTrs(glb, 0), null)
  assert.throws(() => sampleAnimationAtTimes(glb, { animationIndex: 0, nodeIndex: 0, times: [0] }), /finite, non-matrix-authored target base transform/)
})

test('sampling still rejects duplicate channels and missing channel samplers', () => {
  const duplicate = animationGlb('translation')
  duplicate.gltf.animations[0].channels.push({ ...duplicate.gltf.animations[0].channels[0] })
  assert.throws(() => sampleAnimationAtTimes(duplicate, { animationIndex: 0, nodeIndex: 0, times: [0] }), /duplicate translation channels/)

  const missingSampler = animationGlb('translation')
  missingSampler.gltf.animations[0].channels[0].sampler = 1
  assert.throws(() => sampleAnimationAtTimes(missingSampler, { animationIndex: 0, nodeIndex: 0, times: [0] }), /has no sampler/)
})

test('animation STEP channels retain the left key and quaternion LINEAR uses shortest-arc normalized interpolation', () => {
  const step = sampleAnimationAtTimes(animationGlb('translation', 'STEP'), { animationIndex: 0, nodeIndex: 0, times: [0.5] })
  assert.deepEqual(step[0].translation, [0, 0, 0])
  const rotation = sampleAnimationAtTimes(animationGlb('rotation'), { animationIndex: 0, nodeIndex: 0, times: [0.5] })
  assert.deepEqual(rotation[0].rotation, [0, 0, 0, 1])
})

test('unsupported cubic interpolation fails closed', () => {
  assert.throws(() => sampleAnimationAtTimes(animationGlb('translation', 'CUBICSPLINE'), { animationIndex: 0, nodeIndex: 0, times: [0.5] }), /interpolation CUBICSPLINE is unsupported/)
})

test('bind-pose height skins the exact source-proven renderer vertices', () => {
  const measured = measureBindPoseBodyHeight(skinGlb([1, 0, 0, 0, 1, 0, 0, 0]), [1])
  assert.equal(measured.height, 2)
  assert.equal(measured.vertexCount, 2)
  assert.throws(() => measureBindPoseBodyHeight(skinGlb([1, 0, 0, 0, 1, 0, 0, 0]), []), /selection is empty/)
  assert.throws(() => measureBindPoseBodyHeight(skinGlb([1, 0, 0, 0, 1, 0, 0, 0]), [1, 1]), /repeats a GLB node index/)
})

test('bind-pose height applies ancestor joint and inverse-bind transforms without reapplying mesh world transforms', () => {
  const glb = transformedSkinGlb()
  const oneRenderer = measureBindPoseBodyHeight(glb, [2])
  assert.deepEqual([oneRenderer.minY, oneRenderer.maxY, oneRenderer.height], [3, 5, 2])
  const exactRendererUnion = measureBindPoseBodyHeight(glb, [2, 3])
  assert.deepEqual([exactRendererUnion.minY, exactRendererUnion.maxY, exactRendererUnion.height, exactRendererUnion.vertexCount], [3, 5, 2, 4])
})

test('bind-pose height rejects negative skin weights rather than normalizing invalid data', () => {
  const glb = skinGlb([-1, 2, 0, 0, 1, 0, 0, 0])
  assert.throws(() => measureBindPoseBodyHeight(glb, [1]), /negative or non-finite skin weight/)
})

test('bind-pose height validates and samples indexed primitives', () => {
  const weights = [1, 0, 0, 0, 1, 0, 0, 0]
  const valid = measureBindPoseBodyHeight(skinGlb(weights, [1, 0]), [1])
  assert.deepEqual([valid.height, valid.vertexCount], [2, 2])
  assert.throws(() => measureBindPoseBodyHeight(skinGlb(weights, [0, 2]), [1]), /out-of-range vertex index/)
})
