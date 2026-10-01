import * as THREE from 'three'

export interface HaloFollowBinding {
  haloNodeIndex: number
  targetNodeIndex: number
  offset: number[]
  rotation: number[]
  clampMin: number[]
  clampMax: number[]
  positionPower: number
  rotationPower: number
  fixYRotation: boolean
}

// The source coefficients are per-update powers. Use a 60 Hz reference so
// browser frame rate does not change the hover's follow speed.
function followAmount(power: number, delta: number) {
  return 1 - Math.pow(1 - power, Math.max(0, delta) * 60)
}

export function createHaloFollower(root: THREE.Object3D, bindings: readonly HaloFollowBinding[], objects: Map<number, THREE.Object3D[]>) {
  root.updateWorldMatrix(true, true)
  const followers = bindings.flatMap(binding => {
    const halos = objects.get(binding.haloNodeIndex), targets = objects.get(binding.targetNodeIndex)
    if (halos?.length !== 1 || targets?.length !== 1 || !halos[0].parent || halos[0] === targets[0]) return []
    const halo = halos[0], target = targets[0]
    const originalPosition = halo.position.clone(), originalRotation = halo.quaternion.clone()
    const originalYaw = new THREE.Euler().setFromQuaternion(halo.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y
    const offset = new THREE.Vector3().fromArray(binding.offset), relativeRotation = new THREE.Quaternion().fromArray(binding.rotation)
    const min = new THREE.Vector3().fromArray(binding.clampMin), max = new THREE.Vector3().fromArray(binding.clampMax)
    const position = originalPosition.clone(), rotation = originalRotation.clone()
    const authoredClips = new WeakMap<THREE.AnimationClip, boolean>()
    let initialized = false
    const hasAuthoredMotion = (clip: THREE.AnimationClip) => {
      if (!authoredClips.has(clip)) authoredClips.set(clip, clip.tracks.some(track => {
        if (track.name !== `${halo.name}.position` && track.name !== `${halo.name}.quaternion`) return false
        const size = track.getValueSize()
        for (let i = size; i < track.values.length; i += size) {
          if (track instanceof THREE.QuaternionKeyframeTrack) {
            const first = new THREE.Quaternion().fromArray(track.values, 0)
            if (first.angleTo(new THREE.Quaternion().fromArray(track.values, i)) > 1e-5) return true
          } else for (let k = 0; k < size; k++) if (Math.abs(track.values[i + k] - track.values[k]) > 1e-7) return true
        }
        return false
      }))
      return authoredClips.get(clip)
    }
    return [{
      reset() { halo.position.copy(originalPosition); halo.quaternion.copy(originalRotation); initialized = false },
      update(delta: number, clip: THREE.AnimationClip | null) {
        // A varying animation on the follow root is authoritative. Child mesh
        // animations remain untouched while their parent follows normally.
        const authored = clip && hasAuthoredMotion(clip)
        if (authored) { initialized = false; return }
        const parent = halo.parent!
        const goal = parent.worldToLocal(target.localToWorld(offset.clone()))
        // Keep the follow state separately: constant mixer tracks can write the
        // rest pose again each frame, but must not restart the hover's smoothing.
        position.lerp(goal, initialized ? followAmount(binding.positionPower, delta) : 1)
        // Apply source limits in the target's coordinate frame, not world axes.
        const limited = target.worldToLocal(parent.localToWorld(position.clone())).clamp(min, max)
        position.copy(parent.worldToLocal(target.localToWorld(limited)))
        halo.position.copy(position)
        const goalRotation = target.getWorldQuaternion(new THREE.Quaternion()).multiply(relativeRotation)
        if (binding.fixYRotation) {
          const angles = new THREE.Euler().setFromQuaternion(goalRotation, 'YXZ')
          angles.y = originalYaw
          goalRotation.setFromEuler(angles)
        }
        goalRotation.premultiply(parent.getWorldQuaternion(new THREE.Quaternion()).invert())
        rotation.slerp(goalRotation, initialized ? followAmount(binding.rotationPower, delta) : 1)
        halo.quaternion.copy(rotation)
        halo.updateWorldMatrix(false, true)
        initialized = true
      },
    }]
  })
  return {
    reset() { followers.forEach(follower => follower.reset()) },
    update(delta: number, clip: THREE.AnimationClip | null) { root.updateWorldMatrix(true, true); followers.forEach(follower => follower.update(delta, clip)) },
  }
}
