import type { PerspectiveCamera, Vector3 } from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export const STUDENT_EYE_HEIGHT = 1.25
export const STUDENT_FOLLOW_HEIGHT = 0.9

export function studentCameraView(camera: PerspectiveCamera, controls: OrbitControls, position: [number, number], angle: number, firstPerson: boolean, followOffset: Vector3) {
  const damping = controls.enableDamping
  controls.enableDamping = false; controls.update()
  controls.enableZoom = !firstPerson
  controls.minDistance = firstPerson ? 0.01 : 4; controls.maxDistance = firstPerson ? 0.01 : 18
  controls.minPolarAngle = 0.15; controls.maxPolarAngle = firstPerson ? Math.PI * 0.9 : Math.PI / 2.5
  camera.fov = firstPerson ? 65 : 38; camera.updateProjectionMatrix()
  controls.target.set(position[0], firstPerson ? STUDENT_EYE_HEIGHT : STUDENT_FOLLOW_HEIGHT, position[1])
  camera.position.copy(controls.target)
  // A tiny orbit pivots the viewing direction at the student's eyes, within their collision footprint.
  if (firstPerson) { camera.position.x -= Math.sin(angle) * 0.01; camera.position.z -= Math.cos(angle) * 0.01 }
  else camera.position.add(followOffset)
  controls.update(); controls.enableDamping = damping
}
