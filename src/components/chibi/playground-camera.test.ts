import assert from 'node:assert/strict'
import test from 'node:test'
import { PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { studentCameraView, STUDENT_EYE_HEIGHT } from './playground-camera'
import { cameraWalkDirection } from '@/lib/chibi/playground-simulation'

function setup() {
  const camera = new PerspectiveCamera(38, 1, 0.1, 450), controls = new OrbitControls(camera)
  camera.position.set(3.5, 7.9, 6); controls.target.set(0, 0.9, 0); controls.enableDamping = true; controls.enablePan = false; controls.update()
  return { camera, controls, offset: camera.position.clone().sub(controls.target) }
}

test('first person uses eye height and student facing with a fixed viewpoint inside the body footprint', () => {
  const { camera, controls, offset } = setup(), angle = 1.3
  studentCameraView(camera, controls, [12, -4], angle, true, offset)
  const direction = camera.getWorldDirection(new Vector3())
  assert.ok(direction.distanceTo(new Vector3(Math.sin(angle), 0, Math.cos(angle))) < 0.000001)
  assert.ok(Math.abs(camera.position.y - STUDENT_EYE_HEIGHT) < 0.000001)
  assert.ok(camera.position.distanceTo(new Vector3(12, STUDENT_EYE_HEIGHT, -4)) <= 0.010001)
  assert.equal(camera.fov, 65); assert.equal(controls.enableZoom, false); assert.equal(controls.enableDamping, true)
  controls.update(); assert.ok(camera.position.distanceTo(controls.target) <= 0.010001)
})

test('first-person walking stays camera-relative after looking in a different direction', () => {
  const { camera, controls, offset } = setup()
  studentCameraView(camera, controls, [0, 0], Math.PI / 2, true, offset)
  const input = cameraWalkDirection([0, 1], [camera.position.x - controls.target.x, camera.position.z - controls.target.z])
  assert.ok(Math.abs(input[0] - 1) < 0.000001); assert.ok(Math.abs(input[1]) < 0.000001)
  camera.position.set(0, STUDENT_EYE_HEIGHT, 0.01); controls.update()
  const turned = cameraWalkDirection([0, 1], [camera.position.x - controls.target.x, camera.position.z - controls.target.z])
  assert.ok(Math.abs(turned[0]) < 0.000001); assert.ok(Math.abs(turned[1] + 1) < 0.000001)
})

test('switching back restores the previous third-person angle and zoom around the current position', () => {
  const { camera, controls, offset } = setup(), original = offset.clone()
  studentCameraView(camera, controls, [0, 0], 0, true, offset)
  studentCameraView(camera, controls, [5, 8], 0, false, offset)
  assert.ok(camera.position.clone().sub(controls.target).distanceTo(original) < 0.000001)
  assert.ok(controls.target.distanceTo(new Vector3(5, 0.9, 8)) < 0.000001)
  assert.equal(camera.fov, 38); assert.equal(controls.enableZoom, true); assert.equal(controls.minDistance, 4); assert.equal(controls.maxDistance, 18)
  assert.ok(offset.equals(original), 'the saved third-person offset must not change')
})
