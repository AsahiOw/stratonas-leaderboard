import { AnimationClip, Object3D } from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { downloadChibiModel } from './chibi-model-download'

export type ChibiDelivery = { version: 1; clips: { name: string; duration: number }[] }

export function chibiPartUrl(url: string, part: 'initial' | 'animation', clip: string) {
  const params = new URLSearchParams({ part, clip, v: '1' })
  return `${url}${url.includes('?') ? '&' : '?'}${params}`
}

export async function loadChibiAnimation(buffer: ArrayBuffer, model: GLTF): Promise<AnimationClip> {
  const nodes = new Map<number, Object3D>()
  for (const [object, reference] of model.parser.associations) {
    if (object instanceof Object3D && reference.nodes !== undefined) nodes.set(reference.nodes, object)
  }
  const loader = new GLTFLoader()
  // Let Three build its standard STEP/LINEAR/CUBICSPLINE and morph tracks,
  // using the original objects so duplicate names and unnamed nodes bind exactly.
  loader.register(() => ({
    name: 'ChibiAnimationNodes',
    loadNode: index => {
      const node = nodes.get(index)
      if (!node) return Promise.reject(new Error(`Animation node ${index} is missing`))
      return Promise.resolve(node)
    },
  }))
  const result = await loader.parseAsync(buffer, '')
  if (result.animations.length !== 1) throw new Error('Animation payload must contain one clip')
  return result.animations[0]
}

export function createChibiAnimationLoader(model: GLTF, url: string, signal: AbortSignal) {
  const clips = new Map(model.animations.map(clip => [clip.name, clip]))
  const pending = new Map<string, Promise<AnimationClip>>()
  return {
    clips,
    async get(name: string) {
      signal.throwIfAborted()
      const loaded = clips.get(name)
      if (loaded) return loaded
      let request = pending.get(name)
      if (!request) {
        request = (async () => {
          const buffer = await downloadChibiModel(chibiPartUrl(url, 'animation', name), signal, () => {})
          signal.throwIfAborted()
          const clip = await loadChibiAnimation(buffer, model)
          signal.throwIfAborted()
          if (clip.name !== name) throw new Error('Unexpected animation')
          clips.set(name, clip)
          return clip
        })()
        pending.set(name, request)
        void request.finally(() => pending.delete(name)).catch(() => {})
      }
      return request
    },
  }
}
