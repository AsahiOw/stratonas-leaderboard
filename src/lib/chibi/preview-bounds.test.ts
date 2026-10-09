import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { disableSkinnedMeshFrustumCulling, previewAnchor, previewBounds, previewFitBounds, previewGround, previewPlacement } from './preview-bounds'

test('Hifumi idle-to-pickup keeps the skinned weapon drawable with a stale bound', () => {
  const root = new THREE.Group()
  const bone = new THREE.Bone()
  bone.name = 'Bip001_Weapon'
  root.add(bone)
  const geometry = new THREE.BoxGeometry(0.5, 0.7, 0.1)
  const vertexCount = geometry.getAttribute('position').count
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(vertexCount * 4).fill(0), 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(vertexCount * 4).fill(0).map((_, index) => index % 4 === 0 ? 1 : 0), 4))
  const weapon = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
  weapon.name = 'Hihumi_Original_Weapon'
  root.add(weapon)
  weapon.bind(new THREE.Skeleton([bone]))
  root.updateMatrixWorld(true)

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 5)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
  const mixer = new THREE.AnimationMixer(root)
  const idle = new THREE.AnimationClip('Hihumi_Original_Cafe_Idle', 1, [
    new THREE.VectorKeyframeTrack('Bip001_Weapon.scale', [0, 1], [0.001, 0.001, 0.001, 0.001, 0.001, 0.001]),
    new THREE.VectorKeyframeTrack('Bip001_Weapon.position', [0, 1], [0, -4, 0, 0, -4, 0]),
  ])
  const pickup = new THREE.AnimationClip('Hihumi_Original_Formation_Pickup', 1, [
    new THREE.VectorKeyframeTrack('Bip001_Weapon.position', [0, 1], [0, 0, 0, 0, 0, 0]),
  ])
  const idleAction = mixer.clipAction(idle).play()
  mixer.update(0)
  root.updateMatrixWorld(true)
  weapon.skeleton.update()
  weapon.computeBoundingSphere()
  const idleBound = weapon.boundingSphere?.clone()
  assert.ok(idleBound)
  assert.equal(frustum.intersectsObject(weapon), false)

  idleAction.stop()
  const pickupAction = mixer.clipAction(pickup).play()
  pickupAction.time = 0.92
  mixer.update(0)
  root.updateMatrixWorld(true)
  weapon.skeleton.update()
  assert.deepEqual(bone.scale.toArray(), [1, 1, 1])
  assert.deepEqual(weapon.boundingSphere?.center.toArray(), idleBound.center.toArray())
  assert.equal(frustum.intersectsObject(weapon), false)

  const staticEquipment = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial())
  staticEquipment.name = 'VisibleStaticEquipment'
  root.add(staticEquipment)
  disableSkinnedMeshFrustumCulling(root)

  assert.equal(weapon.visible, true)
  assert.equal((weapon.material as THREE.Material).visible, true)
  assert.equal(weapon.frustumCulled, false)
  assert.equal(staticEquipment.visible, true)
  assert.equal(staticEquipment.frustumCulled, true)
})

test('preview fit ignores tiny posed meshes but keeps ordinary skinned equipment', () => {
  const root = new THREE.Group()
  const makeSkinned = (name: string, dimensions: [number, number, number], x = 0) => {
    const geometry = new THREE.BoxGeometry(...dimensions)
    const vertexCount = geometry.getAttribute('position').count
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(vertexCount * 4).fill(0), 4))
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(vertexCount * 4).fill(0).map((_, index) => index % 4 === 0 ? 1 : 0), 4))
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
    mesh.name = name
    mesh.position.x = x
    const bone = new THREE.Bone()
    mesh.add(bone)
    root.add(mesh)
    return { mesh, bone }
  }
  const body = makeSkinned('Hihumi_Original_Body', [1, 4, 1])
  const weapon = makeSkinned('Hihumi_Original_Weapon', [0.5, 0.7, 0.1])
  weapon.bone.name = 'Bip001_Weapon'
  const gear = makeSkinned('Hihumi_Original_VisibleGear', [0.8, 0.8, 0.8], 3)
  root.updateMatrixWorld(true)
  for (const item of [body, weapon, gear]) item.mesh.bind(new THREE.Skeleton([item.bone]))

  const idle = new THREE.AnimationClip('Hihumi_Original_Cafe_Idle', 1, [
    new THREE.VectorKeyframeTrack('Bip001_Weapon.scale', [0, 1], [0.001, 0.001, 0.001, 0.001, 0.001, 0.001]),
    new THREE.VectorKeyframeTrack('Bip001_Weapon.position', [0, 1], [0, -4, 0, 0, -4, 0]),
  ])
  const mixer = new THREE.AnimationMixer(root)
  mixer.clipAction(idle).play()
  mixer.update(0)
  root.updateMatrixWorld(true)

  const fullBounds = previewBounds(root)
  const fitBounds = previewFitBounds(root)
  assert.ok(fullBounds.min.y < -3.99)
  assert.equal(fitBounds.min.y, -2)
  assert.equal(fitBounds.max.y, 2)
  assert.ok(Math.abs(fitBounds.max.x - 3.4) < 1e-5)
  assert.equal(weapon.mesh.visible, true)
  assert.equal((weapon.mesh.material as THREE.Material).visible, true)
})

test('preview bounds ignore far-away effect meshes when a character rig exists', () => {
  const root = new THREE.Group()
  const geometry = new THREE.BoxGeometry(2, 4, 2)
  const vertexCount = geometry.getAttribute('position').count
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(vertexCount * 4).fill(0), 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(vertexCount * 4).fill(0).map((_, index) => index % 4 === 0 ? 1 : 0), 4))
  const character = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
  const bone = new THREE.Bone()
  character.add(bone)
  character.bind(new THREE.Skeleton([bone]))
  root.add(character)
  const effect = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial())
  effect.position.x = -20
  root.add(effect)
  root.updateMatrixWorld(true)

  const bounds = previewBounds(root)
  assert.deepEqual(bounds.min.toArray(), [-1, -2, -1])
  assert.deepEqual(bounds.max.toArray(), [1, 2, 1])
})

test('preview bounds fall back to every mesh for static scenes', () => {
  const root = new THREE.Group()
  const effect = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial())
  effect.position.x = -20
  root.add(effect)
  root.updateMatrixWorld(true)

  const bounds = previewBounds(root)
  assert.deepEqual(bounds.min.toArray(), [-21, -1, -1])
  assert.deepEqual(bounds.max.toArray(), [-19, 1, 1])
})

test('preview anchor follows the body when accessories are offset', () => {
  const root = new THREE.Group()
  const makeSkinned = (name: string, x: number) => {
    const geometry = new THREE.BoxGeometry(2, 4, 2)
    const vertexCount = geometry.getAttribute('position').count
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(vertexCount * 4).fill(0), 4))
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(vertexCount * 4).fill(0).map((_, index) => index % 4 === 0 ? 1 : 0), 4))
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
    mesh.name = name; mesh.position.x = x
    const bone = new THREE.Bone(); mesh.add(bone); mesh.bind(new THREE.Skeleton([bone])); root.add(mesh)
    return mesh
  }
  makeSkinned('CH0161_Body', 0)
  makeSkinned('CH0161_Weapon', 20)
  root.updateMatrixWorld(true)

  const bounds = previewBounds(root)
  assert.equal(previewAnchor(root, bounds).x, 0)
  assert.equal(bounds.getCenter(new THREE.Vector3()).x, 10)
})

test('preview bounds, anchor, and ground ignore hidden skinned bodies', () => {
  const root = new THREE.Group()
  const makeSkinned = (name: string, x: number, y: number) => {
    const geometry = new THREE.BoxGeometry(2, 4, 2)
    const vertexCount = geometry.getAttribute('position').count
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(vertexCount * 4).fill(0), 4))
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(vertexCount * 4).fill(0).map((_, index) => index % 4 === 0 ? 1 : 0), 4))
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
    mesh.name = name
    mesh.position.set(x, y, 0)
    const bone = new THREE.Bone()
    mesh.add(bone)
    mesh.bind(new THREE.Skeleton([bone]))
    root.add(mesh)
    return mesh
  }
  makeSkinned('Cherino_Original_Body', 0, 0)
  const hiddenParent = new THREE.Group()
  hiddenParent.visible = false
  hiddenParent.position.set(20, -20, 0)
  const hiddenBody = makeSkinned('CherinoRoyalGuard1_Body', 0, 0)
  hiddenBody.visible = true
  hiddenParent.add(hiddenBody)
  root.add(hiddenParent)
  makeSkinned('CherinoRoyalGuard2_Body', -20, -20).visible = false
  root.updateMatrixWorld(true)

  const bounds = previewBounds(root)
  assert.deepEqual(bounds.min.toArray(), [-1, -2, -1])
  assert.deepEqual(bounds.max.toArray(), [1, 2, 1])
  assert.deepEqual(previewAnchor(root, bounds).toArray(), [0, 0, 0])
  assert.equal(previewGround(root, bounds), -2)
})

test('preview bounds remain finite when all meshes are hidden', () => {
  const root = new THREE.Group()
  root.position.set(10, 5, -3)
  const hiddenParent = new THREE.Group()
  hiddenParent.visible = false
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial())
  hiddenParent.add(mesh)
  root.add(hiddenParent)
  root.updateMatrixWorld(true)

  const bounds = previewBounds(root)
  assert.deepEqual(bounds.min.toArray(), [10, 5, -3])
  assert.deepEqual(bounds.max.toArray(), [10, 5, -3])
  assert.deepEqual(previewAnchor(root, bounds).toArray(), [10, 5, -3])
  assert.equal(previewGround(root, bounds), 5)
})

test('preview anchor falls back to full bounds without a body mesh', () => {
  const root = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial())
  mesh.position.x = -20; root.add(mesh); root.updateMatrixWorld(true)
  const bounds = previewBounds(root)
  assert.deepEqual(previewAnchor(root, bounds).toArray(), [-20, 0, 0])
})

test('preview ground ignores a detached negative prop but keeps the body on the platform', () => {
  const root = new THREE.Group()
  const makeSkinned = (name: string, y: number) => {
    const geometry = new THREE.BoxGeometry(2, 4, 2)
    const vertexCount = geometry.getAttribute('position').count
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(vertexCount * 4).fill(0), 4))
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(vertexCount * 4).fill(0).map((_, index) => index % 4 === 0 ? 1 : 0), 4))
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
    mesh.name = name; mesh.position.y = y
    const bone = new THREE.Bone(); mesh.add(bone); mesh.bind(new THREE.Skeleton([bone])); root.add(mesh)
    return mesh
  }
  makeSkinned('CH0103_Body', 2)
  makeSkinned('CH0103_Weapon', -20)
  root.updateMatrixWorld(true)

  const bounds = previewBounds(root)
  assert.equal(previewGround(root, bounds), 0)
})

test('preview ground keeps positive support props and tiny negative noise', () => {
  const root = new THREE.Group()
  const geometry = new THREE.BoxGeometry(2, 4, 2)
  const vertexCount = geometry.getAttribute('position').count
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(vertexCount * 4).fill(0), 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(vertexCount * 4).fill(0).map((_, index) => index % 4 === 0 ? 1 : 0), 4))
  const body = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial()); body.name = 'CH0103_Body'
  const bone = new THREE.Bone(); body.add(bone); body.bind(new THREE.Skeleton([bone])); root.add(body)
  const support = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial()); support.position.y = 3; root.add(support)
  root.updateMatrixWorld(true)
  const bounds = previewBounds(root)
  assert.equal(previewGround(root, bounds), bounds.min.y)
})


test('pickup bounds follow bones after standing bounds were cached', () => {
  const root = new THREE.Group(), bone = new THREE.Bone()
  const geometry = new THREE.BoxGeometry(2, 4, 2), count = geometry.getAttribute('position').count
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(count * 4).fill(0), 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(count * 4).fill(0).map((_, i) => i % 4 === 0 ? 1 : 0), 4))
  const body = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial()); body.name = 'Character_Body'
  root.add(body, bone); body.bind(new THREE.Skeleton([bone])); root.updateMatrixWorld(true)
  assert.equal(previewGround(root, previewBounds(root)), -2)
  bone.position.y = -3; root.updateMatrixWorld(true)
  assert.equal(previewGround(root, previewBounds(root)), -2)
  assert.equal(previewGround(root, previewBounds(root, true)), -5)
})

test('Miyu swimsuit fit uses the body surface rather than oversized integrated hair bounds', () => {
  const root = new THREE.Group()
  for (const [index, height] of [4, 12].entries()) {
    const geometry = new THREE.BoxGeometry(2, height, 2), count = geometry.getAttribute('position').count
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(count * 4).fill(0), 4))
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(count * 4).fill(0).map((_, i) => i % 4 === 0 ? 1 : 0), 4))
    const material = new THREE.MeshBasicMaterial()
    material.name = index === 0 ? 'CH0218_Body' : 'CH0218_Hair'
    const mesh = new THREE.SkinnedMesh(geometry, material)
    mesh.name = `CH0218_Body_${index + 1}`
    const bone = new THREE.Bone()
    mesh.add(bone); root.add(mesh); mesh.bind(new THREE.Skeleton([bone]))
  }
  root.updateMatrixWorld(true)
  assert.equal(previewBounds(root).getSize(new THREE.Vector3()).y, 12)
  assert.equal(previewFitBounds(root).getSize(new THREE.Vector3()).y, 4)
  assert.equal(root.children[1].visible, true)
})

test('Kirino swimsuit placement includes separately skinned legs below the body', () => {
  const root = new THREE.Group(), bone = new THREE.Bone()
  root.add(bone)
  for (const [name, height, y] of [['CH0262_Body_4', 4, 4], ['CH0262_Leg', 2, 1]] as const) {
    const geometry = new THREE.BoxGeometry(2, height, 2), count = geometry.getAttribute('position').count
    geometry.translate(0, y, 0)
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(count * 4).fill(0), 4))
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(count * 4).fill(0).map((_, i) => i % 4 === 0 ? 1 : 0), 4))
    const material = new THREE.MeshBasicMaterial(); material.name = 'CH0262_Body'
    const mesh = new THREE.SkinnedMesh(geometry, material); mesh.name = name
    root.add(mesh); mesh.bind(new THREE.Skeleton([bone]))
  }
  root.updateMatrixWorld(true)
  assert.equal(previewPlacement(root).ground, 0)
  assert.equal(previewFitBounds(root).getSize(new THREE.Vector3()).y, 6)
  bone.position.y = -3
  assert.equal(previewPlacement(root).ground, -3)
})

test('animation placement refreshes the body pose in actor-local space without chasing equipment', () => {
  const holder = new THREE.Group(), root = new THREE.Group(), bone = new THREE.Bone()
  holder.position.set(10, -3, 20); holder.scale.setScalar(2); holder.rotation.y = .7; holder.add(root)
  const geometry = new THREE.BoxGeometry(2, 4, 2), count = geometry.getAttribute('position').count
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(count * 4).fill(0), 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(count * 4).fill(0).map((_, i) => i % 4 === 0 ? 1 : 0), 4))
  const body = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial()); body.name = 'Character_Body'
  root.add(body, bone); body.bind(new THREE.Skeleton([bone]))
  const equipment = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
  equipment.position.set(100, -100, 100); root.add(equipment)
  holder.updateMatrixWorld(true)
  previewBounds(root)
  for (const position of [[3, -20, -8], [-4, 2, 6], [0, 0, 0]]) {
    bone.position.fromArray(position)
    const placement = previewPlacement(root)
    assert.ok(placement.anchor.distanceTo(new THREE.Vector3(...position)) < 1e-6)
    assert.ok(Math.abs(placement.ground - (position[1] - 2)) < 1e-6)
  }
  assert.deepEqual(holder.position.toArray(), [10, -3, 20])
  assert.equal(equipment.visible, true)
})
