import * as THREE from 'three'
import type { StudioLayer } from '@/lib/chibi/studio-scene'
import type { StudioActorController } from './studio-types'

export type StudioRuntimeActor = { group: THREE.Group; controller: StudioActorController | null }

// Clear depth between layers, keeping the source material ordering inside each body/halo.
export function renderStudio(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, actors: Map<string, StudioRuntimeActor>, layers: StudioLayer[]) {
  const background = scene.background, autoClear = renderer.autoClear
  const groups = [...actors.values()].map(actor => ({ group: actor.group, visible: actor.group.visible }))
  const meshes = new Map<string, { mesh: THREE.Mesh; visible: boolean; halo: boolean }[]>()
  for (const [id, actor] of actors) {
    const halo = new Set(actor.controller?.haloMeshes), entries: { mesh: THREE.Mesh; visible: boolean; halo: boolean }[] = []
    actor.group.traverse(object => { if (object instanceof THREE.Mesh) entries.push({ mesh: object, visible: object.visible, halo: halo.has(object) }) })
    meshes.set(id, entries); actor.group.visible = false
  }
  try {
    renderer.autoClear = true; renderer.render(scene, camera)
    renderer.autoClear = false; scene.background = null
    for (const layer of layers) {
      const actor = actors.get(layer.actorId), entries = meshes.get(layer.actorId)
      if (!actor || !entries) continue
      if (!entries.some(entry => entry.visible && entry.halo === (layer.part === 'halo'))) continue
      for (const entry of entries) entry.mesh.visible = entry.visible && entry.halo === (layer.part === 'halo')
      actor.group.visible = groups.find(entry => entry.group === actor.group)?.visible ?? true
      renderer.clearDepth(); renderer.render(scene, camera)
      actor.group.visible = false
    }
  } finally {
    for (const entries of meshes.values()) for (const entry of entries) entry.mesh.visible = entry.visible
    for (const entry of groups) entry.group.visible = entry.visible
    scene.background = background; renderer.autoClear = autoClear
  }
}
