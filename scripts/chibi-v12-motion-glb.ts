import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { parseSweepGlb } from './chibi-v12-structural-sweep'

type JsonRecord = Record<string, any>

export type V12Glb = {
  bytes: Buffer
  sha256: string
  gltf: JsonRecord
  binary: Buffer
}

export type ChibiTrs = {
  translation: number[]
  rotation: number[]
  scale: number[]
}

export type ChibiTrsSample = ChibiTrs & { time: number }

type AccessorData = {
  values: Float64Array
  count: number
  components: number
  componentType: number
  normalized: boolean
}

const ACCESSOR_COMPONENTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT4: 16,
}

const COMPONENT_BYTES: Record<number, number> = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
}

/**
 * Read only an immutable GLB whose expected checksum was captured by the v12
 * roster. The structural acceptance reader validates the GLB chunks and keeps
 * the exact BIN chunk attached to the parsed document.
 */
export async function readV12Glb(filePath: string, expectedSha256: string): Promise<V12Glb> {
  return parseV12GlbBytes(await readFile(filePath), expectedSha256)
}

/**
 * Read a node's validated base TRS without consulting animation channels.
 * Matrix-authored or malformed transforms have no usable local TRS default.
 */
export function readNodeBaseTrs(glb: V12Glb, nodeIndex: number): ChibiTrs | null {
  const node = glb.gltf.nodes?.[nodeIndex]
  if (!Number.isInteger(nodeIndex) || nodeIndex < 0 || !node || typeof node !== 'object' || Array.isArray(node) || node.matrix !== undefined) return null
  try {
    return {
      translation: finiteVector(node.translation ?? [0, 0, 0], 3, 'GLB base translation'),
      rotation: normalizedQuaternion(node.rotation ?? [0, 0, 0, 1], 'GLB base rotation'),
      scale: finiteVector(node.scale ?? [1, 1, 1], 3, 'GLB base scale'),
    }
  } catch {
    return null
  }
}

export function parseV12GlbBytes(bytes: Buffer, expectedSha256: string): V12Glb {
  assert.match(expectedSha256, /^[a-f0-9]{64}$/i, 'Expected v12 GLB SHA-256 must be a 64-character hexadecimal digest.')
  const digest = createHash('sha256').update(bytes).digest('hex')
  assert.equal(digest, expectedSha256.toLowerCase(), 'GLB bytes differ from the immutable v12 checksum.')
  const gltf = parseSweepGlb(bytes, 0)
  const binary = gltf.__chibiBinary
  assert.ok(Buffer.isBuffer(binary), 'Immutable v12 GLB has no BIN chunk.')
  const declaredBinLength = gltf.buffers?.[0]?.byteLength
  assert.ok(Number.isInteger(declaredBinLength) && declaredBinLength >= 0, 'GLB has no valid embedded buffer declaration.')
  assert.ok(binary.length >= declaredBinLength && binary.length <= declaredBinLength + 3, 'GLB BIN chunk length differs from its embedded buffer declaration.')
  for (const [index, view] of (gltf.bufferViews ?? []).entries()) {
    assert.equal(view.buffer, 0, `GLB bufferView ${index} does not reference the embedded buffer.`)
    const end = Number(view.byteOffset ?? 0) + view.byteLength
    assert.ok(Number.isInteger(end) && end <= declaredBinLength, `GLB bufferView ${index} exceeds the declared embedded buffer.`)
  }
  return { bytes, sha256: digest, gltf, binary }
}

/**
 * Sample the local TRS of one exact GLB node at source-selected times. The
 * caller must resolve nodeIndex through the source-pinned rendering profile.
 * Absent TRS channels retain the node's base TRS. Current immutable v12 GLBs
 * use LINEAR channels; STEP is supported and CUBICSPLINE fails closed.
 */
export function sampleAnimationAtTimes(
  glb: V12Glb,
  input: { animationIndex: number; nodeIndex: number; times: readonly number[] },
): ChibiTrsSample[] {
  const { gltf, binary } = glb
  const node = gltf.nodes?.[input.nodeIndex]
  assert.ok(node && typeof node === 'object' && !Array.isArray(node), 'Animation target node index is missing from the GLB.')
  assert.ok(Number.isInteger(input.animationIndex) && input.animationIndex >= 0, 'Animation index must be a non-negative integer.')
  assert.ok(Array.isArray(gltf.animations) && gltf.animations[input.animationIndex], 'Animation index is missing from the GLB.')
  assert.ok(input.times.length > 0 && input.times.every(Number.isFinite), 'Animation sample times must be a non-empty finite list.')

  const animation = gltf.animations[input.animationIndex] as JsonRecord
  const base = readNodeBaseTrs(glb, input.nodeIndex)
  assert.ok(base, 'TRS sampling requires a finite, non-matrix-authored target base transform.')
  const channels = new Map<'translation' | 'rotation' | 'scale', { times: number[]; outputs: number[][]; interpolation: string }>()
  const samplers = animation.samplers
  assert.ok(Array.isArray(animation.channels) && Array.isArray(samplers), 'GLB animation channels or samplers are missing.')
  for (const [channelIndex, channel] of animation.channels.entries()) {
    const target = channel?.target
    if (target?.node !== input.nodeIndex || !['translation', 'rotation', 'scale'].includes(target?.path)) continue
    const path = target.path as 'translation' | 'rotation' | 'scale'
    assert.ok(!channels.has(path), `GLB animation has duplicate ${path} channels for one node.`)
    const sampler = samplers[channel.sampler]
    assert.ok(Number.isInteger(channel.sampler) && sampler, `GLB animation channel ${channelIndex} has no sampler.`)
    const interpolation = sampler.interpolation ?? 'LINEAR'
    assert.ok(interpolation === 'LINEAR' || interpolation === 'STEP', `GLB ${path} sampler interpolation ${String(interpolation)} is unsupported.`)
    const inputAccessor = readAccessor(gltf, binary, sampler.input, `GLB ${path} sampler input`)
    const outputAccessor = readAccessor(gltf, binary, sampler.output, `GLB ${path} sampler output`)
    assert.ok(inputAccessor.componentType === 5126 && inputAccessor.components === 1 && !inputAccessor.normalized, `GLB ${path} sampler input must be float SCALAR.`)
    const width = path === 'rotation' ? 4 : 3
    assert.ok(outputAccessor.componentType === 5126 && outputAccessor.components === width && !outputAccessor.normalized, `GLB ${path} sampler output must be float VEC${width}.`)
    assert.equal(outputAccessor.count, inputAccessor.count, `GLB ${path} sampler output count differs from its input count.`)
    const times = Array.from(inputAccessor.values)
    assert.ok(times.length > 0 && times.every((time, index) => time >= 0 && (index === 0 || time > times[index - 1])), `GLB ${path} sampler input times are not strictly increasing non-negative values.`)
    const outputs = Array.from({ length: outputAccessor.count }, (_, index) => Array.from(outputAccessor.values.slice(index * width, (index + 1) * width)))
    channels.set(path, { times, outputs, interpolation })
  }

  return input.times.map(time => {
    const sample: ChibiTrsSample = { time, translation: [...base.translation], rotation: [...base.rotation], scale: [...base.scale] }
    for (const [path, channel] of channels) {
      const value = sampleSampler(channel, time, path === 'rotation')
      sample[path] = value
    }
    return sample
  })
}

/**
 * Compute bind-pose model-space height from an explicit, source-resolved set
 * of core body node indices. No renderer-name or largest-mesh guess is made.
 */
export function measureBindPoseBodyHeight(glb: V12Glb, bodyNodeIndices: readonly number[]) {
  const { gltf, binary } = glb
  assert.ok(bodyNodeIndices.length > 0, 'Exact source-evidenced core body node selection is empty.')
  assert.equal(new Set(bodyNodeIndices).size, bodyNodeIndices.length, 'Exact core body selection repeats a GLB node index.')
  const parents = buildParentTable(gltf.nodes)
  const worldMatrices = new Map<number, number[]>()
  const visiting = new Set<number>()
  const worldMatrix = (index: number): number[] => {
    const cached = worldMatrices.get(index)
    if (cached) return cached
    assert.ok(Number.isInteger(index) && index >= 0 && index < gltf.nodes.length, `Skin references invalid GLB node ${index}.`)
    assert.ok(!visiting.has(index), `GLB node graph contains a cycle at node ${index}.`)
    visiting.add(index)
    const local = nodeMatrix(gltf.nodes[index], `GLB node ${index}`)
    const parent = parents[index]
    const result = parent === null ? local : multiplyMatrices(worldMatrix(parent), local)
    visiting.delete(index)
    worldMatrices.set(index, result)
    return result
  }

  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let vertexCount = 0
  const seenRendererKeys = new Set<string>()
  for (const nodeIndex of bodyNodeIndices) {
    assert.ok(Number.isInteger(nodeIndex) && nodeIndex >= 0 && nodeIndex < gltf.nodes.length, `Exact core body GLB node index ${nodeIndex} is invalid.`)
    const node = gltf.nodes[nodeIndex] as JsonRecord
    const provenance = node.extras?.chibi?.sourceRenderer
    const rendererKey = sourceReferenceKey(provenance?.sourceReference, `Exact core body node ${nodeIndex} renderer provenance`)
    sourceReferenceKey(provenance?.sourceMeshReference, `Exact core body node ${nodeIndex} mesh provenance`)
    assert.ok(!seenRendererKeys.has(rendererKey), `Exact core body GLB node selection repeats renderer identity ${rendererKey}.`)
    seenRendererKeys.add(rendererKey)
    assert.ok(Number.isInteger(node.mesh) && Number.isInteger(node.skin), `Exact core body node ${nodeIndex} must have both mesh and skin bindings.`)
    const mesh = gltf.meshes?.[node.mesh]
    const skin = gltf.skins?.[node.skin]
    assert.ok(mesh && Array.isArray(mesh.primitives) && mesh.primitives.length > 0, `Exact core body node ${nodeIndex} has no GLB mesh primitives.`)
    assert.ok(skin && Array.isArray(skin.joints) && skin.joints.length > 0, `Exact core body node ${nodeIndex} has no GLB skin joints.`)
    assert.equal(new Set(skin.joints).size, skin.joints.length, `Exact core body node ${nodeIndex} skin repeats a joint node.`)
    for (const [jointIndex, jointNode] of skin.joints.entries()) {
      assert.ok(Number.isInteger(jointNode) && gltf.nodes[jointNode], `Exact core body node ${nodeIndex} skin joint ${jointIndex} is invalid.`)
      worldMatrix(jointNode)
    }
    if (skin.skeleton !== undefined) worldMatrix(skin.skeleton)
    const inverseBindMatrices = skin.inverseBindMatrices === undefined
      ? Array.from({ length: skin.joints.length }, identityMatrix)
      : readInverseBindMatrices(gltf, binary, skin.inverseBindMatrices, skin.joints.length, `Exact core body node ${nodeIndex} inverse-bind matrices`)
    const jointMatrices = skin.joints.map((jointNode: number, index: number) => multiplyMatrices(worldMatrix(jointNode), inverseBindMatrices[index]))
    const defaultWeights = node.weights ?? mesh.weights ?? []
    assert.ok(Array.isArray(defaultWeights), `Exact core body node ${nodeIndex} has invalid default morph weights.`)

    for (const [primitiveIndex, primitive] of mesh.primitives.entries()) {
      const label = `Exact core body node ${nodeIndex} primitive ${primitiveIndex}`
      const attributes = primitive.attributes
      assert.ok(attributes && typeof attributes === 'object' && !Array.isArray(attributes), `${label} has no vertex attributes.`)
      assert.ok(attributes.JOINTS_1 === undefined && attributes.WEIGHTS_1 === undefined, `${label} uses unsupported secondary skin-influence attributes.`)
      const positions = readAccessor(gltf, binary, attributes.POSITION, `${label} POSITION`)
      const joints = readAccessor(gltf, binary, attributes.JOINTS_0, `${label} JOINTS_0`)
      const weights = readAccessor(gltf, binary, attributes.WEIGHTS_0, `${label} WEIGHTS_0`)
      assert.ok(positions.componentType === 5126 && positions.components === 3 && !positions.normalized, `${label} POSITION must be float VEC3.`)
      assert.ok((joints.componentType === 5121 || joints.componentType === 5123) && joints.components === 4 && !joints.normalized, `${label} JOINTS_0 must be unnormalized unsigned-byte/unsigned-short VEC4.`)
      assert.ok(weights.components === 4 && (weights.componentType === 5126
        || ((weights.componentType === 5121 || weights.componentType === 5123) && weights.normalized)), `${label} WEIGHTS_0 must be float VEC4 or normalized unsigned-byte/unsigned-short VEC4.`)
      assert.equal(joints.count, positions.count, `${label} joint count differs from its vertex count.`)
      assert.equal(weights.count, positions.count, `${label} weight count differs from its vertex count.`)
      const morphTargets = primitive.targets ?? []
      assert.ok(Array.isArray(morphTargets), `${label} morph targets are invalid.`)
      assert.ok(defaultWeights.length === 0 || defaultWeights.length === morphTargets.length, `${label} default morph-weight count differs from its target count.`)
      const morphPositionDeltas = morphTargets.map((target: JsonRecord, targetIndex: number) => {
        const weight = defaultWeights[targetIndex] ?? 0
        assert.ok(typeof weight === 'number' && Number.isFinite(weight), `${label} default morph weight ${targetIndex} is invalid.`)
        if (weight === 0 || target.POSITION === undefined) return null
        const delta = readAccessor(gltf, binary, target.POSITION, `${label} morph target ${targetIndex} POSITION`)
        assert.ok(delta.componentType === 5126 && delta.components === 3 && !delta.normalized, `${label} morph POSITION must be float VEC3.`)
        assert.equal(delta.count, positions.count, `${label} morph POSITION count differs from its vertices.`)
        return { weight, values: delta.values }
      })
      const vertexIndices = primitive.indices === undefined
        ? Array.from({ length: positions.count }, (_, index) => index)
        : readIndices(gltf, binary, primitive.indices, positions.count, `${label} indices`)
      assert.ok(vertexIndices.length > 0, `${label} has no rendered vertices.`)
      for (const vertexIndex of vertexIndices) {
        const offset3 = vertexIndex * 3
        const point = [positions.values[offset3], positions.values[offset3 + 1], positions.values[offset3 + 2]]
        for (const morph of morphPositionDeltas) {
          if (!morph) continue
          point[0] += morph.values[offset3] * morph.weight
          point[1] += morph.values[offset3 + 1] * morph.weight
          point[2] += morph.values[offset3 + 2] * morph.weight
        }
        const offset4 = vertexIndex * 4
        const weightRow = Array.from(weights.values.slice(offset4, offset4 + 4))
        assert.ok(weightRow.every(weight => Number.isFinite(weight) && weight >= 0), `${label} vertex ${vertexIndex} has a negative or non-finite skin weight.`)
        const totalWeight = weightRow.reduce((sum, value) => sum + value, 0)
        assert.ok(totalWeight > 0 && Number.isFinite(totalWeight), `${label} vertex ${vertexIndex} has no usable skin weights.`)
        let y = 0
        for (let influence = 0; influence < 4; influence += 1) {
          const weight = weightRow[influence] / totalWeight
          const jointIndex = joints.values[offset4 + influence]
          assert.ok(Number.isInteger(jointIndex) && jointIndex >= 0 && jointIndex < jointMatrices.length, `${label} vertex ${vertexIndex} references invalid skin joint ${jointIndex}.`)
          if (weight === 0) continue
          const transformed = transformPoint(jointMatrices[jointIndex], point)
          y += transformed[1] * weight
        }
        assert.ok(Number.isFinite(y), `${label} vertex ${vertexIndex} produced a non-finite skinned height.`)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        vertexCount += 1
      }
    }
  }
  assert.ok(vertexCount > 0 && Number.isFinite(minY) && Number.isFinite(maxY) && maxY > minY, 'Exact source-evidenced core body vertices do not produce a positive finite bind-pose height.')
  return { minY, maxY, height: maxY - minY, vertexCount }
}

function readInverseBindMatrices(gltf: JsonRecord, binary: Buffer, accessorIndex: unknown, jointCount: number, label: string) {
  const accessor = readAccessor(gltf, binary, accessorIndex, label)
  assert.ok(accessor.componentType === 5126 && accessor.components === 16 && !accessor.normalized, `${label} must be float MAT4.`)
  assert.equal(accessor.count, jointCount, `${label} count differs from the skin joint count.`)
  return Array.from({ length: accessor.count }, (_, index) => Array.from(accessor.values.slice(index * 16, (index + 1) * 16)))
}

function readIndices(gltf: JsonRecord, binary: Buffer, accessorIndex: unknown, vertexCount: number, label: string) {
  const accessor = readAccessor(gltf, binary, accessorIndex, label)
  assert.ok(accessor.components === 1 && [5121, 5123, 5125].includes(accessor.componentType) && !accessor.normalized, `${label} must be an unnormalized unsigned SCALAR accessor.`)
  for (const index of accessor.values) assert.ok(Number.isInteger(index) && index >= 0 && index < vertexCount, `${label} contains an out-of-range vertex index.`)
  return Array.from(new Set(accessor.values))
}

function readAccessor(gltf: JsonRecord, binary: Buffer, accessorIndex: unknown, label: string): AccessorData {
  assert.ok(typeof accessorIndex === 'number' && Number.isInteger(accessorIndex) && accessorIndex >= 0, `${label} accessor index is invalid.`)
  const accessor = gltf.accessors?.[accessorIndex as number]
  assert.ok(accessor && typeof accessor === 'object' && !Array.isArray(accessor), `${label} accessor is missing.`)
  assert.ok(accessor.sparse === undefined, `${label} sparse accessors are unsupported.`)
  assert.ok(Number.isInteger(accessor.bufferView) && accessor.bufferView >= 0, `${label} has no dense bufferView.`)
  const view = gltf.bufferViews?.[accessor.bufferView]
  assert.ok(view && typeof view === 'object' && !Array.isArray(view), `${label} bufferView is missing.`)
  assert.equal(view.buffer, 0, `${label} does not use the embedded GLB buffer.`)
  const componentBytes = COMPONENT_BYTES[accessor.componentType]
  const components = ACCESSOR_COMPONENTS[accessor.type]
  assert.ok(componentBytes && components, `${label} uses an unsupported accessor type or component type.`)
  assert.ok(Number.isInteger(accessor.count) && accessor.count > 0, `${label} has an invalid accessor count.`)
  assert.ok(Number.isInteger(view.byteLength) && view.byteLength >= 0, `${label} has an invalid bufferView length.`)
  const viewOffset = Number(view.byteOffset ?? 0)
  const accessorOffset = Number(accessor.byteOffset ?? 0)
  assert.ok(Number.isInteger(viewOffset) && viewOffset >= 0 && Number.isInteger(accessorOffset) && accessorOffset >= 0, `${label} has an invalid byte offset.`)
  assert.ok(accessorOffset % componentBytes === 0, `${label} accessor offset is misaligned.`)
  const elementBytes = components * componentBytes
  const stride = view.byteStride ?? elementBytes
  assert.ok(Number.isInteger(stride) && stride >= elementBytes && stride % componentBytes === 0, `${label} has an invalid byte stride.`)
  const viewEnd = viewOffset + view.byteLength
  const lastEnd = viewOffset + accessorOffset + (accessor.count - 1) * stride + elementBytes
  assert.ok(viewEnd <= binary.length && lastEnd <= viewEnd, `${label} accessor bytes exceed its bufferView.`)
  const data = new DataView(binary.buffer, binary.byteOffset, binary.byteLength)
  const values = new Float64Array(accessor.count * components)
  for (let element = 0; element < accessor.count; element += 1) {
    for (let component = 0; component < components; component += 1) {
      const offset = viewOffset + accessorOffset + element * stride + component * componentBytes
      let value: number
      switch (accessor.componentType) {
        case 5120: value = data.getInt8(offset); break
        case 5121: value = data.getUint8(offset); break
        case 5122: value = data.getInt16(offset, true); break
        case 5123: value = data.getUint16(offset, true); break
        case 5125: value = data.getUint32(offset, true); break
        case 5126: value = data.getFloat32(offset, true); break
        default: throw new Error(`${label} uses an unsupported accessor component type.`)
      }
      if (accessor.normalized) {
        assert.ok(accessor.componentType !== 5125 && accessor.componentType !== 5126, `${label} has invalid normalized component type.`)
        value = accessor.componentType === 5120 ? Math.max(value / 127, -1)
          : accessor.componentType === 5122 ? Math.max(value / 32767, -1)
            : accessor.componentType === 5121 ? value / 255
              : value / 65535
      }
      assert.ok(Number.isFinite(value), `${label} contains a non-finite accessor value.`)
      values[element * components + component] = value
    }
  }
  return { values, count: accessor.count, components, componentType: accessor.componentType, normalized: Boolean(accessor.normalized) }
}

function sampleSampler(channel: { times: number[]; outputs: number[][]; interpolation: string }, time: number, quaternion: boolean) {
  const { times, outputs, interpolation } = channel
  const finish = (value: number[]) => quaternion ? normalizedQuaternion(value, 'Sampled GLB quaternion') : value
  if (time <= times[0]) return finish([...outputs[0]])
  if (time >= times[times.length - 1]) return finish([...outputs[outputs.length - 1]])
  let left = 0
  while (times[left + 1] <= time) left += 1
  if (interpolation === 'STEP') return finish([...outputs[left]])
  const amount = (time - times[left]) / (times[left + 1] - times[left])
  const start = outputs[left]
  const end = outputs[left + 1]
  assert.equal(start.length, end.length, 'GLB sampler output dimensions differ between keys.')
  if (!quaternion) return start.map((value, index) => value + (end[index] - value) * amount)
  return slerpShortest(start, end, amount)
}

function slerpShortest(startInput: number[], endInput: number[], amount: number) {
  const start = normalizedQuaternion(startInput, 'GLB quaternion start key')
  const end = normalizedQuaternion(endInput, 'GLB quaternion end key')
  let dot = start.reduce((sum, value, index) => sum + value * end[index], 0)
  const adjusted = [...end]
  if (dot < 0) {
    dot = -dot
    for (let index = 0; index < 4; index += 1) adjusted[index] *= -1
  }
  if (dot > 0.9995) return normalizedQuaternion(start.map((value, index) => value + amount * (adjusted[index] - value)), 'GLB interpolated quaternion')
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)))
  const denominator = Math.sin(angle)
  assert.ok(denominator > 0, 'GLB quaternion interpolation is degenerate.')
  return normalizedQuaternion(start.map((value, index) => Math.sin((1 - amount) * angle) / denominator * value
    + Math.sin(amount * angle) / denominator * adjusted[index]), 'GLB interpolated quaternion')
}

function finiteVector(value: unknown, length: number, label: string) {
  assert.ok(Array.isArray(value) && value.length === length && value.every(item => typeof item === 'number' && Number.isFinite(item)), `${label} must be a finite ${length}-component vector.`)
  return [...value] as number[]
}

function normalizedQuaternion(value: unknown, label: string) {
  const quaternion = finiteVector(value, 4, label)
  const length = Math.hypot(...quaternion)
  assert.ok(length > 1e-12, `${label} has zero length.`)
  return quaternion.map(component => component / length)
}

function sourceReferenceKey(value: unknown, label: string) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} is missing exact source identity.`)
  const reference = value as JsonRecord
  for (const field of ['bundleSha256', 'serializedFile', 'objectId']) {
    assert.ok(typeof reference[field] === 'string' && reference[field].trim(), `${label}.${field} must be a non-empty string.`)
  }
  return `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}`
}

function buildParentTable(nodes: readonly JsonRecord[]) {
  assert.ok(Array.isArray(nodes) && nodes.length > 0, 'GLB has no nodes for skinning.')
  const parents: Array<number | null> = nodes.map(() => null)
  const hasParent = new Set<number>()
  for (const [parentIndex, node] of nodes.entries()) {
    if (node.children === undefined) continue
    assert.ok(Array.isArray(node.children), `GLB node ${parentIndex} children must be an array.`)
    for (const child of node.children as unknown[]) {
      assert.ok(Number.isInteger(child) && (child as number) >= 0 && (child as number) < nodes.length, `GLB node ${parentIndex} has an invalid child index.`)
      assert.ok(!hasParent.has(child as number), `GLB node ${child} has multiple parents.`)
      hasParent.add(child as number)
      parents[child as number] = parentIndex
    }
  }
  return parents
}

function nodeMatrix(node: JsonRecord, label: string) {
  if (node.matrix !== undefined) {
    assert.ok(!('translation' in node) && !('rotation' in node) && !('scale' in node), `${label} mixes matrix and TRS transforms.`)
    const matrix = finiteVector(node.matrix, 16, `${label} matrix`)
    return matrix
  }
  const translation = finiteVector(node.translation ?? [0, 0, 0], 3, `${label} translation`)
  const rotation = normalizedQuaternion(node.rotation ?? [0, 0, 0, 1], `${label} rotation`)
  const scale = finiteVector(node.scale ?? [1, 1, 1], 3, `${label} scale`)
  const [x, y, z, w] = rotation
  const [sx, sy, sz] = scale
  return [
    (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
    (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
    (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    translation[0], translation[1], translation[2], 1,
  ]
}

function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

function multiplyMatrices(left: number[], right: number[]) {
  const result = new Array<number>(16).fill(0)
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1) {
        result[column * 4 + row] += left[index * 4 + row] * right[column * 4 + index]
      }
    }
  }
  return result
}

function transformPoint(matrix: number[], point: number[]) {
  const [x, y, z] = point
  const out = [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
    matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15],
  ]
  assert.ok(Math.abs(out[3] - 1) <= 1e-5, 'Skin transform produced a non-affine bind-pose point.')
  return out
}
