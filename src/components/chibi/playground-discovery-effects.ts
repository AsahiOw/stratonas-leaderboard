import * as THREE from 'three'
import { PLAYGROUND_DISCOVERIES } from '@/lib/chibi/playground-discovery'

export function createPlaygroundDiscoveryEffects(scene: THREE.Scene) {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? 0.12 : 0.28
    if (!i) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  shape.closePath()
  const starGeometry = new THREE.ShapeGeometry(shape), ringGeometry = new THREE.RingGeometry(0.25, 0.32, 24)
  const starMaterial = new THREE.MeshBasicMaterial({ color: '#ffce60', side: THREE.DoubleSide, toneMapped: false })
  const ringMaterial = new THREE.MeshBasicMaterial({ color: '#ffdf83', transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false })
  ringMaterial.forceSinglePass = true
  const stars = new THREE.InstancedMesh(starGeometry, starMaterial, PLAYGROUND_DISCOVERIES.length), rings = new THREE.InstancedMesh(ringGeometry, ringMaterial, PLAYGROUND_DISCOVERIES.length)
  stars.frustumCulled = rings.frustumCulled = false
  const root = new THREE.Group(); root.visible = false; root.add(stars, rings); scene.add(root)
  const dummy = new THREE.Object3D(), floorRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  const bursts = new Map<string, number>(); let previous: Set<string> | null = null
  return {
    root,
    update(camera: THREE.Camera, time: number, visited: string[], visible: boolean) {
      root.visible = visible
      const collected = new Set(visited)
      if (!visible) { previous = collected; return }
      PLAYGROUND_DISCOVERIES.forEach((spot, i) => {
        if (collected.has(spot.id) && previous && !previous.has(spot.id)) bursts.set(spot.id, time)
        const burst = bursts.get(spot.id), progress = burst === undefined ? 1 : Math.min(1, (time - burst) / 0.8)
        const scale = collected.has(spot.id) ? 1 - progress : 1
        dummy.position.set(spot.point[0], collected.has(spot.id) ? 0.5 + progress * 1.3 : 0.55 + Math.sin(time * 3 + i) * 0.08, spot.point[1])
        dummy.quaternion.copy(camera.quaternion); dummy.scale.setScalar(scale); dummy.updateMatrix(); stars.setMatrixAt(i, dummy.matrix)
        dummy.position.y = 0.055; dummy.quaternion.copy(floorRotation); dummy.scale.setScalar(scale); dummy.updateMatrix(); rings.setMatrixAt(i, dummy.matrix)
      })
      stars.instanceMatrix.needsUpdate = rings.instanceMatrix.needsUpdate = true; previous = collected
    },
    dispose() { stars.dispose(); rings.dispose(); starGeometry.dispose(); ringGeometry.dispose(); starMaterial.dispose(); ringMaterial.dispose(); root.removeFromParent() },
  }
}
