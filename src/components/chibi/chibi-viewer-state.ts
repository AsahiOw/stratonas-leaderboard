import * as THREE from 'three'
import { normalizePlaybackTime } from '@/lib/chibi-mouth'
import { sourceObjectKey, type RenderingProfileChildRendererEvent } from '@/lib/chibi/rendering-profile'

export interface ViewerRendererDefault {
  sourceReference: RenderingProfileChildRendererEvent['sourceRendererReference']
  defaultVisible: boolean
}

/** Reset to the imported idle face before evaluating each action-local timeline. */
export function alternateFaceVisibilityAtTime(
  defaults: ReadonlyMap<number, boolean>,
  events: readonly { clip: string; time: number; int: number; function: string }[],
  clip: string, time: number, duration: number, loop: boolean,
) {
  const visibility = new Map(defaults)
  const playbackTime = normalizePlaybackTime(time, duration, loop)
  for (const event of events) {
    if (event.clip !== clip || event.time > playbackTime + 1e-4 || !visibility.has(event.int)) continue
    if (event.function === 'AniEvt_EnableChildRenderer' || event.function === 'AniEvt_DisableChildRenderer') {
      visibility.set(event.int, event.function === 'AniEvt_EnableChildRenderer')
    }
  }
  return visibility
}

/**
 * Evaluate exact profile renderer events from a clean source-authored state.
 * Events without a profile target cannot reach this helper: profile building
 * rejects them before publication, so no name/renderer-order fallback exists.
 */
export function rendererVisibilityAtTime(
  defaults: readonly ViewerRendererDefault[],
  events: readonly RenderingProfileChildRendererEvent[],
  clip: string,
  time: number,
  duration: number,
  loop: boolean,
) {
  const visibility = new Map(defaults.map(renderer => [sourceObjectKey(renderer.sourceReference), renderer.defaultVisible]))
  const playbackTime = normalizePlaybackTime(time, duration, loop)
  for (const event of events) {
    if (event.clip !== clip || !Number.isFinite(event.time) || event.time > playbackTime) continue
    const key = sourceObjectKey(event.sourceRendererReference)
    if (!visibility.has(key)) continue
    visibility.set(key, event.action === 'enable')
  }
  return visibility
}

export function inPlaceClip(source: THREE.AnimationClip, root: THREE.Object3D) {
  const clip = source.clone()
  root.updateWorldMatrix(true, true)
  for (const track of clip.tracks) {
    if (!(track instanceof THREE.VectorKeyframeTrack) || !track.name.endsWith('.position')) continue
    const node = root.getObjectByName(track.name.slice(0, -'.position'.length))
    const originalParentType = (node?.userData as { chibiArrangementOriginalParentType?: string } | undefined)?.chibiArrangementOriginalParentType
    if (!node || (node.parent !== root && (node.parent?.type === 'Bone' || originalParentType === 'Bone'))) continue
    const parentMatrix = new THREE.Matrix3().setFromMatrix4(node.parent?.matrixWorld ?? new THREE.Matrix4())
    const inverseParent = parentMatrix.clone().invert()
    const delta = new THREE.Vector3()
    for (let index = 3; index < track.values.length; index += 3) {
      delta.set(track.values[index] - track.values[0], track.values[index + 1] - track.values[1], track.values[index + 2] - track.values[2])
      delta.applyMatrix3(parentMatrix)
      // Remove world-horizontal travel while retaining vertical body bob on rotated skeletons.
      delta.set(0, delta.y, 0).applyMatrix3(inverseParent)
      track.values[index] = track.values[0] + delta.x
      track.values[index + 1] = track.values[1] + delta.y
      track.values[index + 2] = track.values[2] + delta.z
    }
  }
  return clip
}
