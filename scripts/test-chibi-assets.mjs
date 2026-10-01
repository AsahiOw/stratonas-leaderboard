import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { chibiModels } from '../src/lib/chibi-students.ts'

if (typeof globalThis.ProgressEvent !== 'function') {
  globalThis.ProgressEvent = class ProgressEvent {
    constructor(type, init = {}) {
      this.type = type
      Object.assign(this, init)
    }
  }
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const componentReaders = {
  5121: [1, 'readUInt8'],
  5123: [2, 'readUInt16LE'],
  5125: [4, 'readUInt32LE'],
  5126: [4, 'readFloatLE'],
}
const componentCounts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }

function parseGlb(buffer) {
  assert.ok(buffer.length >= 20, 'GLB is truncated')
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF', 'GLB magic header is invalid')
  assert.equal(buffer.readUInt32LE(4), 2, 'GLB must use version 2')
  assert.equal(buffer.readUInt32LE(8), buffer.length, 'GLB length does not match its file size')

  let json
  let binary
  for (let offset = 12; offset < buffer.length;) {
    assert.ok(offset + 8 <= buffer.length, 'GLB chunk header is truncated')
    const length = buffer.readUInt32LE(offset)
    const type = buffer.readUInt32LE(offset + 4)
    const end = offset + 8 + length
    assert.ok(end <= buffer.length, 'GLB chunk extends past the file')
    if (type === 0x4e4f534a) {
      assert.equal(json, undefined, 'GLB has more than one JSON chunk')
      json = JSON.parse(buffer.toString('utf8', offset + 8, end).trim())
    } else if (type === 0x004e4942) {
      assert.equal(binary, undefined, 'GLB has more than one binary chunk')
      binary = buffer.subarray(offset + 8, end)
    }
    offset = end
  }
  assert.ok(json, 'GLB has no JSON chunk')
  assert.ok(binary, 'GLB has no binary chunk')
  assert.equal(json.asset?.version, '2.0', 'GLB JSON must declare glTF 2.0')
  assert.ok(json.nodes?.length && json.meshes?.length && json.skins?.length, 'GLB has no scene rig')
  return { json, binary }
}

function readAccessor(json, binary, index) {
  const accessor = json.accessors[index]
  assert.ok(accessor, `missing accessor ${index}`)
  const view = json.bufferViews[accessor.bufferView]
  const [componentSize, reader] = componentReaders[accessor.componentType] ?? []
  const componentCount = componentCounts[accessor.type]
  assert.ok(view && componentSize && componentCount, `unsupported accessor ${index}`)
  const stride = view.byteStride ?? componentSize * componentCount
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  return Array.from({ length: accessor.count }, (_, row) => Array.from(
    { length: componentCount }, (_, component) => binary[reader](start + row * stride + component * componentSize),
  ))
}

function imageBytes(json, binary, index) {
  const image = json.images[index]
  const view = json.bufferViews[image?.bufferView]
  assert.ok(view, `image ${index} has no buffer view`)
  const start = view.byteOffset ?? 0
  const bytes = binary.subarray(start, start + view.byteLength)
  assert.equal(bytes.length, view.byteLength, `image ${index} is outside the binary chunk`)
  return bytes
}

async function validatePngs(json, binary) {
  assert.ok(json.images?.length, 'GLB has no embedded images')
  assert.ok(json.textures?.length, 'GLB has no textures')
  for (const [index, image] of json.images.entries()) {
    assert.equal(image.mimeType, 'image/png', `image ${index} is not a PNG`)
    const { data, info } = await sharp(imageBytes(json, binary, index)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.ok(info.width > 0 && info.height > 0, `image ${index} has invalid dimensions`)
    assert.equal(data.length, info.width * info.height * info.channels, `image ${index} failed to decode`)
  }
}

async function validateMouth(json, binary) {
  const materialIndex = json.materials.findIndex((material) => material.name === 'Haruna_Original_Mouth')
  assert.ok(materialIndex >= 0, 'GLB has no Haruna_Original_Mouth material')
  const material = json.materials[materialIndex]
  assert.equal(material.alphaMode, 'BLEND', 'mouth material must use alpha blending')
  const mouthTiles = material.extras?.mouthTiles
  const expectedMouthClips = [
    'Haruna_Original_Cafe_Idle',
    'Haruna_Original_Cafe_Walk',
    'Haruna_Original_Formation_Pickup',
    'Haruna_Original_Cafe_Reaction',
  ]
  assert.ok(mouthTiles && typeof mouthTiles === 'object', 'mouth material has no mouthTiles events')
  for (const clipName of expectedMouthClips) {
    const events = mouthTiles[clipName]
    assert.ok(Array.isArray(events) && events.length > 0, `mouthTiles has no events for ${clipName}`)
    assert.ok(events.every((event) => Array.isArray(event) && event.length === 2 && event.every(Number.isFinite)), `mouthTiles has invalid events for ${clipName}`)
  }
  const textureIndex = material.pbrMetallicRoughness?.baseColorTexture?.index
  const texture = json.textures[textureIndex]
  const image = json.images[texture?.source]
  assert.ok(texture && image, 'mouth material has no texture image')
  assert.equal(image.name, 'Character_Mouth', 'mouth material does not use Character_Mouth')
  assert.equal(image.mimeType, 'image/png', 'Character_Mouth must be a PNG')

  const primitives = json.meshes.flatMap((mesh) => mesh.primitives)
  const eyes = primitives.filter((primitive) => json.materials[primitive.material]?.name === 'Haruna_Original_EyeMouth')
  const mouths = primitives.filter((primitive) => primitive.material === materialIndex)
  assert.equal(eyes.length, 1, 'expected one EyeMouth primitive')
  assert.equal(mouths.length, 1, 'expected one separate mouth primitive')
  const eyeIndices = readAccessor(json, binary, eyes[0].indices).flat()
  const mouthIndices = readAccessor(json, binary, mouths[0].indices).flat()
  assert.equal(eyeIndices.length, 136 * 3, 'EyeMouth primitive must contain 136 triangles')
  assert.equal(mouthIndices.length, 32 * 3, 'mouth primitive must contain 32 triangles')

  const uv = readAccessor(json, binary, mouths[0].attributes.TEXCOORD_0)
  const { data, info } = await sharp(imageBytes(json, binary, texture.source)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = 0
  let colored = 0
  const sample = (u, v) => {
    assert.ok(u >= 0 && u <= 1 && v >= 0 && v <= 1, 'mouth UV is outside the atlas')
    const x = Math.min(info.width - 1, Math.floor(u * info.width))
    const y = Math.min(info.height - 1, Math.floor(v * info.height))
    const offset = (y * info.width + x) * info.channels
    const alpha = data[offset + 3]
    if (alpha === 0) transparent += 1
    if (alpha > 0 && Math.max(data[offset], data[offset + 1], data[offset + 2]) - Math.min(data[offset], data[offset + 1], data[offset + 2]) > 10) colored += 1
  }
  const samplesPerEdge = 8
  for (let index = 0; index < mouthIndices.length; index += 3) {
    const [a, b, c] = mouthIndices.slice(index, index + 3).map((vertex) => uv[vertex])
    for (let row = 0; row <= samplesPerEdge; row += 1) {
      for (let column = 0; column <= samplesPerEdge - row; column += 1) {
        const third = samplesPerEdge - row - column
        sample(
          (a[0] * row + b[0] * column + c[0] * third) / samplesPerEdge,
          (a[1] * row + b[1] * column + c[1] * third) / samplesPerEdge,
        )
      }
    }
  }
  assert.ok(transparent > 0, 'mouth UVs do not sample transparent atlas background')
  assert.ok(colored > 0, 'mouth UVs do not sample colored atlas pixels')
  return { transparent, colored }
}

function texturelessJson(json, binary) {
  const clone = JSON.parse(JSON.stringify(json))
  clone.buffers[0].uri = `data:application/octet-stream;base64,${Buffer.from(binary).toString('base64')}`
  delete clone.images
  delete clone.textures
  delete clone.samplers
  delete clone.materials
  for (const mesh of clone.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) delete primitive.material
  }
  for (const key of ['extensionsUsed', 'extensionsRequired']) {
    clone[key] = clone[key]?.filter((name) => !name.startsWith('KHR_materials_') && !name.startsWith('KHR_texture_'))
  }
  return JSON.stringify(clone)
}

function parseGltf(data) {
  return new Promise((resolve, reject) => new GLTFLoader().parse(data, '', resolve, reject))
}

function captureSkinnedVertices(meshes) {
  const point = new THREE.Vector3()
  const vertices = []
  for (const mesh of meshes) {
    const count = mesh.geometry.getAttribute('position').count
    const step = Math.max(1, Math.floor(count / 256))
    for (let index = 0; index < count; index += step) {
      mesh.getVertexPosition(index, point)
      vertices.push(point.x, point.y, point.z)
    }
  }
  return vertices
}

function verticesChanged(before, after) {
  return before.some((value, index) => Math.abs(value - after[index]) > 1e-7)
}

async function validateClip(data, expectedName) {
  const gltf = await parseGltf(data)
  const skinnedMeshes = []
  gltf.scene.traverse((object) => {
    if (object.isSkinnedMesh) skinnedMeshes.push(object)
  })
  assert.ok(skinnedMeshes.length, 'loaded scene has no SkinnedMesh objects')
  for (const mesh of skinnedMeshes) {
    assert.ok(mesh.skeleton?.bones.length, `${mesh.name || 'skinned mesh'} has no skeleton bones`)
    assert.ok(mesh.geometry.getAttribute('skinIndex'), `${mesh.name || 'skinned mesh'} has no skin indices`)
    assert.ok(mesh.geometry.getAttribute('skinWeight'), `${mesh.name || 'skinned mesh'} has no skin weights`)
  }

  const clip = gltf.animations.find((candidate) => candidate.name === expectedName)
  assert.ok(clip, `missing animation clip ${expectedName}`)
  assert.ok(clip.tracks.length && clip.duration > 0, `${expectedName} has no usable tracks`)
  for (const track of clip.tracks) {
    const parsed = THREE.PropertyBinding.parseTrackName(track.name)
    assert.ok(THREE.PropertyBinding.findNode(gltf.scene, parsed.nodeName), `${expectedName} track ${track.name} targets no node`)
  }

  const mixer = new THREE.AnimationMixer(gltf.scene)
  mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1).play()
  mixer.setTime(0)
  gltf.scene.updateMatrixWorld(true)
  const initial = captureSkinnedVertices(skinnedMeshes)
  for (const fraction of [0.25, 0.5, 0.75]) {
    mixer.setTime(clip.duration * fraction)
    gltf.scene.updateMatrixWorld(true)
    assert.ok(verticesChanged(initial, captureSkinnedVertices(skinnedMeshes)), `${expectedName} does not deform skinned vertices`)
  }
  return gltf.animations.map((clip) => clip.name)
}

async function main() {
  assert.ok(chibiModels.length, 'chibi manifest is empty')
  const targets = process.argv[2]
    ? [{ ...chibiModels[0], modelUrl: path.resolve(process.argv[2]) }]
    : chibiModels
  for (const model of targets) {
    const url = new URL(model.modelUrl, 'http://localhost')
    const assetPath = process.argv[2] ? model.modelUrl : path.join(repoRoot, 'public', decodeURIComponent(url.pathname.replace(/^\/+/, '')))
    const { json, binary } = parseGlb(await fs.readFile(assetPath))
    await validatePngs(json, binary)
    await validateMouth(json, binary)
    const data = texturelessJson(json, binary)
    const expectedClips = Object.values(model.clips)
    assert.equal(new Set(expectedClips).size, expectedClips.length, `${model.id} manifest has duplicate clips`)

    let actualClips
    for (const clipName of expectedClips) {
      const names = await validateClip(data, clipName)
      actualClips ??= names
    }
    assert.deepEqual(actualClips.sort(), expectedClips.slice().sort(), `${model.id} animation list differs from its manifest`)
    console.log(`PASS ${path.relative(repoRoot, assetPath)}: ${actualClips.length} clips, ${json.images.length} embedded PNG(s)`)
  }
}

try {
  await main()
} catch (error) {
  console.error(`FAIL chibi assets: ${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
}
