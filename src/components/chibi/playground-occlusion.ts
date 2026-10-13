import * as THREE from 'three'

export function createPlaygroundOcclusion(root: THREE.Object3D) {
  type Obstacle = { mesh: THREE.Mesh; box: THREE.Box3; original: THREE.Material | THREE.Material[]; copies: THREE.Material[] | null; value: number; target: number }
  const obstacles = new Map<THREE.Object3D, Obstacle>(), size = new THREE.Vector3()
  root.updateMatrixWorld(true)
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    const box = new THREE.Box3().setFromObject(object)
    if (box.getSize(size).y < 0.55 || materials.every(material => material.transparent) || materials.some(material => /floor|grass|ceiling|roof/i.test(material.name))) return
    obstacles.set(object, { mesh: object, box, original: object.material, copies: null, value: 1, target: 1 })
  })
  const raycaster = new THREE.Raycaster(), origin = new THREE.Vector3(), target = new THREE.Vector3(), direction = new THREE.Vector3()
  const hits: THREE.Intersection[] = [], candidates: THREE.Mesh[] = []
  let nextProbe = 0
  return {
    update(camera: THREE.Camera, focus: [number, number] | null, delta: number, time: number) {
      if (!focus) for (const obstacle of obstacles.values()) obstacle.target = 1
      else if (time >= nextProbe) {
        nextProbe = time + 0.1
        for (const obstacle of obstacles.values()) obstacle.target = 1
        camera.getWorldPosition(origin)
        for (const height of [0.25, 0.9, 1.45]) {
          target.set(focus[0], height, focus[1]); direction.subVectors(target, origin)
          raycaster.set(origin, direction.clone().normalize()); raycaster.far = direction.length() - 0.1
          candidates.length = 0; hits.length = 0
          for (const obstacle of obstacles.values()) if (raycaster.ray.intersectsBox(obstacle.box)) candidates.push(obstacle.mesh)
          raycaster.intersectObjects(candidates, false, hits)
          for (const hit of hits) obstacles.get(hit.object)!.target = 0.16
        }
      }
      for (const obstacle of obstacles.values()) {
        if (!obstacle.copies && obstacle.target < 1) {
          obstacle.copies = (Array.isArray(obstacle.original) ? obstacle.original : [obstacle.original]).map(material => { const copy = material.clone(); copy.forceSinglePass = true; return copy })
          obstacle.mesh.material = Array.isArray(obstacle.original) ? obstacle.copies : obstacle.copies[0]
        }
        if (!obstacle.copies) continue
        obstacle.value = THREE.MathUtils.damp(obstacle.value, obstacle.target, 10, delta)
        if (Math.abs(obstacle.value - obstacle.target) < 0.005) obstacle.value = obstacle.target
        const originals = Array.isArray(obstacle.original) ? obstacle.original : [obstacle.original]
        obstacle.copies.forEach((material, i) => {
          const transparent = originals[i].transparent || obstacle.value < 1
          if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true }
          material.opacity = originals[i].opacity * obstacle.value
          material.depthWrite = obstacle.value === 1 && originals[i].depthWrite
        })
      }
    },
    dispose() {
      for (const obstacle of obstacles.values()) { obstacle.mesh.material = obstacle.original; obstacle.copies?.forEach(material => material.dispose()) }
      obstacles.clear()
    },
  }
}
