import assert from 'node:assert/strict'
import test from 'node:test'
import { AnimationMixer, LoopOnce, Mesh, Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { splitChibiGlb, unpackChibiGlb } from './delivery'
import { createChibiAnimationLoader, loadChibiAnimation } from '../../components/chibi/chibi-animation-download'

function fixture(extensionsUsed: string[] = []) {
  const arrays = [new Float32Array([0, 1]), new Float32Array([0, 0, 0, 1, 0, 0]), new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), new Float32Array([0, 1]),
    new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 0, 0, 0]),
    new Float32Array([0, 0, 0, 1, 0, 0, 1, 0]), new Float32Array([99, 99, 99])]
  let offset = 0
  const bufferViews = arrays.map(array => { const view = { buffer: 0, byteOffset: offset, byteLength: array.byteLength }; offset += array.byteLength; return view })
  const json = { asset: { version: '2.0' }, extensionsUsed, scene: 0, scenes: [{ nodes: [0, 1, 2], extras: { chibi: { expressionEvents: 'preserved' } } }],
    nodes: [{ name: 'same', mesh: 0 }, { name: 'same' }, {}],
    meshes: [{ primitives: [{ attributes: { POSITION: 2 }, targets: [{ POSITION: 3 }] }], weights: [0] }],
    accessors: arrays.map((array, index) => ({ bufferView: index, componentType: 5126, count: index === 0 || index === 4 ? 2 : index === 6 ? 2 : array.length / 3,
      type: index === 0 || index === 4 ? 'SCALAR' : index === 6 ? 'VEC4' : 'VEC3', ...(index === 0 ? { min: [0], max: [1] } : {}) })),
    bufferViews, buffers: [{ byteLength: offset }], animations: [
      { name: 'Idle', samplers: [{ input: 0, output: 1 }], channels: [{ sampler: 0, target: { node: 1, path: 'translation' } }] },
      { name: 'Action', samplers: [{ input: 0, output: 4 }, { input: 0, output: 5, interpolation: 'CUBICSPLINE' }, { input: 0, output: 6, interpolation: 'STEP' }],
        channels: [{ sampler: 0, target: { node: 0, path: 'weights' } }, { sampler: 1, target: { node: 1, path: 'translation' } }, { sampler: 2, target: { node: 2, path: 'rotation' } }] },
    ] }
  const text = Buffer.from(JSON.stringify(json)), padded = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 32)])
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8)
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + offset, 8)
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
  binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, padded, binHeader, ...arrays.map(array => Buffer.from(array.buffer))])
}
const arrayBuffer = (buffer: Buffer) => Uint8Array.from(buffer).buffer

test('initial delivery keeps geometry and source metadata; sidecar excludes model resources and preserves clip bytes', () => {
  const full = fixture(), base = unpackChibiGlb(splitChibiGlb(full, 'initial', 'Idle')), extra = unpackChibiGlb(splitChibiGlb(full, 'animation', 'Action'))
  assert.deepEqual(base.json.animations?.map(clip => clip.name), ['Idle'])
  assert.deepEqual(base.json.scenes?.[0].extras?.chibi, { expressionEvents: 'preserved' })
  assert.deepEqual(base.json.scenes?.[0].extras?.chibiDelivery, { version: 1, clips: [{ name: 'Idle', duration: 1 }, { name: 'Action', duration: 1 }] })
  assert.equal(extra.json.meshes, undefined); assert.equal(extra.json.images, undefined); assert.equal(extra.json.skins, undefined)
  assert.deepEqual(extra.json.animations?.[0].channels.map(channel => channel.target.node), [0, 1, 2])
  assert.ok(base.bin.length < unpackChibiGlb(full).bin.length)
  assert.throws(() => splitChibiGlb(full, 'animation', 'missing'), /Animation not found/)
})

test('unrecognized extensions retain the original full model rather than losing extension data', () => {
  const bytes = fixture(['EXT_unknown_buffer_references'])
  assert.equal(splitChibiGlb(bytes, 'initial', 'Idle'), bytes)
  assert.throws(() => splitChibiGlb(bytes, 'animation', 'Action'), /does not support split animations/)
})

test('lazy animation binds duplicate and unnamed nodes exactly, preserving cubic, step and morph playback', async () => {
  const bytes = fixture(), loader = new GLTFLoader()
  const full = await loader.parseAsync(arrayBuffer(bytes), '')
  const base = await loader.parseAsync(arrayBuffer(splitChibiGlb(bytes, 'initial', 'Idle')), '')
  const extra = await loadChibiAnimation(arrayBuffer(splitChibiGlb(bytes, 'animation', 'Action')), base)
  for (const [model, clip] of [[full, full.animations[1]], [base, extra]] as const) {
    const mixer = new AnimationMixer(model.scene)
    mixer.clipAction(clip).setLoop(LoopOnce, 1).play(); mixer.update(.5)
  }
  for (let index = 0; index < 3; index++) {
    const node = (model: typeof base) => [...model.parser.associations].find(([object, reference]) => object instanceof Object3D && reference.nodes === index)![0] as Object3D
    assert.deepEqual(node(base).position.toArray(), node(full).position.toArray())
    assert.deepEqual(node(base).quaternion.toArray(), node(full).quaternion.toArray())
    if (index === 0) assert.deepEqual((node(base) as Mesh).morphTargetInfluences, (node(full) as Mesh).morphTargetInfluences)
  }
  assert.ok(extra.tracks.some(track => (track as unknown as { createInterpolant: { isInterpolantFactoryMethodGLTFCubicSpline?: boolean } }).createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline))
})

test('clip loading deduplicates requests, retries failures and caches completed clips', async t => {
  const bytes = fixture(), base = await new GLTFLoader().parseAsync(arrayBuffer(splitChibiGlb(bytes, 'initial', 'Idle')), '')
  let requests = 0
  t.mock.method(globalThis, 'fetch', async () => { requests++; return requests === 1 ? new Response(null, { status: 503 }) : new Response(arrayBuffer(splitChibiGlb(bytes, 'animation', 'Action'))) })
  const animations = createChibiAnimationLoader(base, `/api/admin/chibi/assets/test/${'a'.repeat(64)}.glb`, new AbortController().signal)
  assert.equal(await animations.get('Idle'), base.animations[0]); assert.equal(requests, 0)
  await assert.rejects(animations.get('Action'), /HTTP 503/)
  const [first, second] = await Promise.all([animations.get('Action'), animations.get('Action')])
  assert.equal(first, second); assert.equal(await animations.get('Action'), first); assert.equal(requests, 2)
})
