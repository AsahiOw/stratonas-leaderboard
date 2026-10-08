import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'

type Accessor = { bufferView?: number; max?: number[]; sparse?: { indices: { bufferView: number }; values: { bufferView: number } } }
type Animation = { name: string; samplers: { input: number; output: number }[]; channels: { target: { node?: number; path: string } }[] }
type Document = {
  asset: object; extensionsUsed?: string[]; extensionsRequired?: string[]
  animations?: Animation[]; accessors: Accessor[]
  bufferViews: { buffer: number; byteOffset?: number; byteLength: number }[]; buffers: { byteLength: number; uri?: string }[]
  meshes?: { primitives: { attributes: Record<string, number>; indices?: number; targets?: Record<string, number>[] }[] }[]
  skins?: { inverseBindMatrices?: number }[]; images?: { bufferView?: number }[]
  nodes?: object[]; scenes?: { extras?: Record<string, unknown>; nodes?: number[] }[]; scene?: number
  materials?: object[]; textures?: object[]; samplers?: object[]; cameras?: object[]; extensions?: object
}

export function unpackChibiGlb(bytes: Buffer): { json: Document; bin: Buffer } {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error('Invalid chibi GLB')
  const length = bytes.readUInt32LE(12), binStart = 20 + length
  const json = JSON.parse(bytes.toString('utf8', 20, binStart)) as Document
  return { json, bin: bytes.subarray(binStart + 8, binStart + 8 + bytes.readUInt32LE(binStart)) }
}

// Nodes retain their indices. Animation sidecars bind to the already loaded nodes.
export function splitChibiGlb(bytes: Buffer, part: 'initial' | 'animation', name: string): Buffer {
  const { json, bin } = unpackChibiGlb(bytes)
  const all = json.animations ?? [], clip = all.find(animation => animation.name === name)
  if ((part === 'animation' || name) && !clip) throw new Error('Animation not found')
  // Unknown extensions may carry additional accessor references. Keep these models
  // on the full-file path rather than stripping data we cannot safely remap.
  if ((json.extensionsUsed ?? []).some(extension => !['KHR_materials_unlit', 'KHR_texture_transform'].includes(extension))
    || json.buffers.length !== 1 || json.buffers[0].uri) {
    if (part === 'initial') return bytes
    throw new Error('Model does not support split animations')
  }
  json.animations = clip ? [clip] : []
  if (part === 'initial') {
    const scene = json.scenes?.[json.scene ?? 0]
    if (!scene) return bytes
    scene.extras = { ...scene.extras, chibiDelivery: { version: 1, clips: all.map(animation => ({
      name: animation.name, duration: Math.max(0, ...animation.samplers.map(sampler => json.accessors[sampler.input].max?.[0] ?? 0)),
    })) } }
  } else {
    delete json.meshes; delete json.skins; delete json.images; delete json.materials
    delete json.textures; delete json.samplers; delete json.cameras; delete json.extensions
    delete json.extensionsUsed; delete json.extensionsRequired
    json.nodes = (json.nodes ?? []).map(() => ({}))
    json.scenes = [{ nodes: [] }]; json.scene = 0
  }
  const used = new Set<number>(), addAccessor = (index: number | undefined) => { if (index !== undefined) used.add(index) }
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives) {
    Object.values(primitive.attributes).forEach(addAccessor); addAccessor(primitive.indices)
    for (const target of primitive.targets ?? []) Object.values(target).forEach(addAccessor)
  }
  for (const skin of json.skins ?? []) addAccessor(skin.inverseBindMatrices)
  for (const animation of json.animations) for (const sampler of animation.samplers) { addAccessor(sampler.input); addAccessor(sampler.output) }
  const views = new Set<number>(), view = (index: number | undefined) => { if (index !== undefined) views.add(index) }
  for (const index of used) {
    const accessor = json.accessors[index]
    view(accessor.bufferView); view(accessor.sparse?.indices.bufferView); view(accessor.sparse?.values.bufferView)
  }
  for (const image of json.images ?? []) view(image.bufferView)
  const accessorMap = new Map([...used].sort((a, b) => a - b).map((index, next) => [index, next]))
  const viewMap = new Map([...views].sort((a, b) => a - b).map((index, next) => [index, next]))
  json.accessors = [...accessorMap.keys()].map(index => json.accessors[index])
  for (const accessor of json.accessors) {
    if (accessor.bufferView !== undefined) accessor.bufferView = viewMap.get(accessor.bufferView)!
    if (accessor.sparse) {
      accessor.sparse.indices.bufferView = viewMap.get(accessor.sparse.indices.bufferView)!
      accessor.sparse.values.bufferView = viewMap.get(accessor.sparse.values.bufferView)!
    }
  }
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives) {
    for (const key of Object.keys(primitive.attributes)) primitive.attributes[key] = accessorMap.get(primitive.attributes[key])!
    if (primitive.indices !== undefined) primitive.indices = accessorMap.get(primitive.indices)!
    for (const target of primitive.targets ?? []) for (const key of Object.keys(target)) target[key] = accessorMap.get(target[key])!
  }
  for (const skin of json.skins ?? []) if (skin.inverseBindMatrices !== undefined) skin.inverseBindMatrices = accessorMap.get(skin.inverseBindMatrices)!
  for (const animation of json.animations) for (const sampler of animation.samplers) {
    sampler.input = accessorMap.get(sampler.input)!; sampler.output = accessorMap.get(sampler.output)!
  }
  for (const image of json.images ?? []) if (image.bufferView !== undefined) image.bufferView = viewMap.get(image.bufferView)!
  let offset = 0
  const chunks: Buffer[] = []
  json.bufferViews = [...viewMap.keys()].map(index => {
    const source = json.bufferViews[index], padding = (4 - offset % 4) % 4
    chunks.push(Buffer.alloc(padding)); offset += padding
    const start = offset
    chunks.push(bin.subarray(source.byteOffset ?? 0, (source.byteOffset ?? 0) + source.byteLength)); offset += source.byteLength
    return { ...source, buffer: 0, byteOffset: start }
  })
  chunks.push(Buffer.alloc((4 - offset % 4) % 4))
  const binary = Buffer.concat(chunks); json.buffers = [{ byteLength: binary.length }]
  const text = Buffer.from(JSON.stringify(json)), padded = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 32)])
  const header = Buffer.alloc(20), binaryHeader = Buffer.alloc(8)
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + binary.length, 8)
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
  binaryHeader.writeUInt32LE(binary.length, 0); binaryHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, padded, binaryHeader, binary])
}

const generating = new Map<string, Promise<string>>()
export async function chibiDeliveryFile(source: string, checksum: string, part: 'initial' | 'animation', name: string) {
  const key = createHash('sha256').update(JSON.stringify(['chibi-delivery-v1', checksum, part, name])).digest('hex')
  const filename = join(dirname(source), 'delivery-v1', `${key}.glb`)
  const contained = (path: string) => { if (!path.startsWith(dirname(source) + sep)) throw new Error('Delivery escapes model storage') }
  if ((await stat(filename).catch(() => null))?.isFile()) {
    contained(await realpath(filename))
    return { filename, key }
  }
  let pending = generating.get(filename)
  if (!pending) {
    pending = (async () => {
      const bytes = splitChibiGlb(await readFile(source), part, name)
      await mkdir(dirname(filename), { recursive: true })
      contained(await realpath(dirname(filename)))
      const temporary = `${filename}.${randomUUID()}.tmp`
      try { await writeFile(temporary, bytes); await rename(temporary, filename) }
      finally { await unlink(temporary).catch(() => {}) }
      return filename
    })()
    generating.set(filename, pending)
    void pending.finally(() => generating.delete(filename)).catch(() => {})
  }
  return { filename: await pending, key }
}
