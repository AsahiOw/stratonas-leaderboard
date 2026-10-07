import * as THREE from 'three'
import { normalizePlaybackTime } from '@/lib/chibi-mouth'
import { sourceObjectKey, type RenderingProfileChildRendererEvent } from '@/lib/chibi/rendering-profile'

export interface ViewerRendererDefault {
  sourceReference: RenderingProfileChildRendererEvent['sourceRendererReference']
  defaultVisible: boolean
}

/** EX preview only; the source does not expose Hoshino's shield-enable callback. */
export function applyHoshinoShieldPreview(root: THREE.Object3D, clip: string) {
  root.traverse(object => {
    const ref = object.userData.chibi?.sourceReference
    if (ref?.bundleSha256 === '553b7fe20e78793df20939c307d5b8cfb979be7e84edad08b3e3fd03a9f5cd26'
      && ref.serializedFile === 'CAB-1d74217275224e4ba8d7167893fe01e5'
      && ref.objectId === '5492241791769865631') {
      object.visible = clip === 'Hoshino_Original_Exs'
    }
  })
}

/** Makoto preview fallback: the original hair-switch callback is unavailable. */
export function applyMakotoHairPreview(root: THREE.Object3D, clip: string) {
  if (clip !== 'CH0079_Exs') return
  const hair = new Map<string, THREE.Object3D>()
  root.traverse(object => {
    const ref = object.userData.chibi?.sourceReference
    if (ref?.bundleSha256 === 'a1017c71727b4955f2051868456e618026674e078b3843e2649d8943873c457f'
      && ref.serializedFile === 'CAB-1469fcd164501c78fabde162fa4f06c4') hair.set(ref.objectId, object)
  })
  const normal = hair.get('3218009238889943685'), alternate = hair.get('3134145453237654149')
  const hat = root.getObjectByName('bone_hat')
  if (!normal || !alternate || !hat) return
  // The authored EX scale collapses the hat before the afro reaction.
  const afro = Math.max(...hat.scale.toArray().map(Math.abs)) < 0.1
  normal.visible = !afro
  alternate.visible = afro
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
