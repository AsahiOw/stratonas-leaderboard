export type StudioActor = { id: string; studentId: number; position: [number, number, number]; rotation: number; tilt?: number; scale: number; clip: string | null; time: number; paused: boolean }
export type StudioLayer = { actorId: string; part: 'body' | 'halo' }
export type StudioScene = { version: 1; actors: StudioActor[]; layers?: StudioLayer[]; background: string | null; camera: { position: [number, number, number]; target: [number, number, number] } }
export const STUDIO_STORAGE_KEY = 'stratonas-photo-studio-v1'
export const DEFAULT_STUDIO_CAMERA: StudioScene['camera'] = { position: [0, 2.4, 8], target: [0, 1, 0] }

export function parseStudioScene(text: string): StudioScene {
  const value = JSON.parse(text) as StudioScene
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1000
  const vector = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every(finite)
  if (!value || value.version !== 1 || !Array.isArray(value.actors) || value.actors.length > 12
    || !(value.background === null || typeof value.background === 'string')
    || !value.camera || !vector(value.camera.position) || !vector(value.camera.target)
    || value.actors.some(a => !a || typeof a.id !== 'string' || !a.id || !Number.isInteger(a.studentId)
      || !vector(a.position) || !finite(a.rotation) || !finite(a.scale) || a.scale < 0.1 || a.scale > 3
      || (a.tilt !== undefined && (!finite(a.tilt) || Math.abs(a.tilt) > 90))
      || !(a.clip === null || typeof a.clip === 'string') || !finite(a.time) || a.time < 0 || typeof a.paused !== 'boolean')
    || new Set(value.actors.map(a => a.id)).size !== value.actors.length) throw new Error('Saved scene is invalid.')
  if (value.layers !== undefined && (!Array.isArray(value.layers) || value.layers.length !== value.actors.length * 2
    || value.layers.some(layer => !layer || !value.actors.some(actor => actor.id === layer.actorId) || !['body', 'halo'].includes(layer.part))
    || new Set(value.layers.map(layer => `${layer.actorId}:${layer.part}`)).size !== value.layers.length)) throw new Error('Saved layers are invalid.')
  return value
}

// Back to front, with each halo initially beside its own body. Older saves keep working.
export function studioLayers(actors: StudioActor[], layers: StudioLayer[] = []): StudioLayer[] {
  const result = layers.filter(layer => actors.some(actor => actor.id === layer.actorId))
  for (const actor of actors) for (const part of ['body', 'halo'] as const) {
    if (!result.some(layer => layer.actorId === actor.id && layer.part === part)) result.push({ actorId: actor.id, part })
  }
  return result
}
