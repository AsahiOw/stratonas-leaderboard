import * as THREE from 'three'

export const PLAYGROUND_STUDENT_HEIGHT = 1.5

// Include the head: some exports put it entirely in separate Face/Hair primitives.
// Measure the visible character before source units are normalized.
// Equipment and generated outline children must not determine student height.
export function playgroundBodyBounds(root: THREE.Object3D, refreshPose = false) {
  const bounds = new THREE.Box3()
  root.traverse(object => {
    if (!(object instanceof THREE.SkinnedMesh)) return
    if (/(?:^|_)(?:prop|weapon|halo|shadow|effect|particle)(?:$|_)|_outline(?:$|_)/i.test(object.name)) return
    for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) { if (!parent.visible) return; if (parent === root) break }
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    if (!materials.some(material => /(?:^|_)(?:Body|Face|Hair)(?:$|\.\d+$)/i.test(material.name))) return
    if (refreshPose || !object.boundingBox) object.computeBoundingBox()
    if (object.boundingBox) bounds.union(object.boundingBox.clone().applyMatrix4(object.matrixWorld))
  })
  return bounds.isEmpty() ? null : bounds
}

export function playgroundModelScale(bounds: THREE.Box3) {
  return PLAYGROUND_STUDENT_HEIGHT / Math.max(bounds.getSize(new THREE.Vector3()).y, 0.000001)
}
