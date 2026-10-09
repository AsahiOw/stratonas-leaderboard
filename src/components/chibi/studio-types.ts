import type * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export type StudioPlayback = { clip: string | null; time: number; duration: number; paused: boolean; loadingClip?: string; animationError?: boolean }
export type StudioActorController = {
  haloMeshes: THREE.Mesh[]
  footprintRadius?: number
  clips: { name: string; duration: number }[]
  play: (clip: string, options?: { loop?: boolean; movement?: boolean }) => Promise<boolean>
  pause: (paused: boolean) => void
  seek: (time: number) => void
  playback: () => StudioPlayback
}
export type StudioViewerHost = {
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  group: THREE.Group
  ready: (controller: StudioActorController) => void
  failed: (message: string) => void
  playground?: boolean
  paused?: () => boolean
  animationInterval?: () => number
  registerFrame?: (update: (time: number) => void) => () => void
}
