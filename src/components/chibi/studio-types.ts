import type * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export type StudioPlayback = { clip: string | null; time: number; duration: number; paused: boolean }
export type StudioActorController = {
  haloMeshes: THREE.Mesh[]
  clips: { name: string; duration: number }[]
  play: (clip: string) => void
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
}
