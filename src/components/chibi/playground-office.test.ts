import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const asset = readFileSync(new URL('../../../public/assets/playground/schale-office.glb', import.meta.url))
const jsonLength = asset.readUInt32LE(12)
const scene = JSON.parse(asset.subarray(20, 20 + jsonLength).toString())
const binary = asset.subarray(28 + jsonLength)

function accessor(index: number): number[][] {
  const value = scene.accessors[index], view = scene.bufferViews[value.bufferView]
  const width = value.type === 'VEC3' ? 3 : value.type === 'VEC2' ? 2 : 1
  const bytes = value.componentType === 5123 ? 2 : 4
  const offset = (view.byteOffset ?? 0) + (value.byteOffset ?? 0), stride = view.byteStride ?? width * bytes
  return Array.from({ length: value.count }, (_, i) => Array.from({ length: width }, (_, j) => {
    const at = offset + i * stride + j * bytes
    return value.componentType === 5126 ? binary.readFloatLE(at) : bytes === 2 ? binary.readUInt16LE(at) : binary.readUInt32LE(at)
  }))
}

test('the shipped office is a bounded GLB with embedded browser-sized textures and valid material bindings', () => {
  assert.equal(asset.readUInt32LE(0), 0x46546c67); assert.equal(asset.readUInt32LE(4), 2)
  assert.equal(asset.readUInt32LE(8), asset.length); assert.ok(asset.length < 3 * 1024 ** 2)
  assert.ok(scene.meshes.length > 0 && scene.meshes.length <= 93); assert.ok(scene.images.length > 0 && scene.images.length <= 76)
  for (const mesh of scene.meshes) for (const primitive of mesh.primitives) {
    const material = scene.materials[primitive.material], map = material.pbrMetallicRoughness.baseColorTexture
    if (map) { assert.ok(scene.images[scene.textures[map.index].source]); assert.notEqual(primitive.attributes.TEXCOORD_0, undefined) }
    else assert.deepEqual(material.pbrMetallicRoughness.baseColorFactor, [0, 0, 0, 1], 'unwrapped metal uses its solid source color')
  }
  for (const image of scene.images) {
    const view = scene.bufferViews[image.bufferView], png = binary.subarray(view.byteOffset, view.byteOffset + view.byteLength)
    assert.equal(image.mimeType, 'image/png'); assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.ok(png.readUInt32BE(16) <= 1024 && png.readUInt32BE(20) <= 1024)
  }
})

test('converted office triangles are finite, nondegenerate, and fit the navigation scale', () => {
  let triangles = 0
  for (const mesh of scene.meshes) for (const primitive of mesh.primitives) {
    const positions = accessor(primitive.attributes.POSITION), indices = accessor(primitive.indices).flat()
    assert.ok(positions.every(point => point.every(Number.isFinite) && Math.abs(point[0]) < 29 && Math.abs(point[2]) < 19 && point[1] > -0.2 && point[1] < 3.2))
    for (let i = 0; i < indices.length; i += 3) {
      const a = positions[indices[i]], b = positions[indices[i + 1]], c = positions[indices[i + 2]]
      const u = b.map((v, j) => v - a[j]), v = c.map((n, j) => n - a[j])
      const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      assert.ok(cross.some(n => n !== 0), `${mesh.name} contains a zero-area triangle`); triangles++
    }
  }
  assert.ok(triangles > 30000 && triangles < 35000)
})
