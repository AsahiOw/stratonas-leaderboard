import * as THREE from 'three'

const PREVIEW_TINY_MESH_RELATIVE_SIZE = 0.005

function visibleInHierarchy(root: THREE.Object3D, object: THREE.Object3D) {
  let current: THREE.Object3D | null = object
  while (current) {
    if (!current.visible) return false
    if (current === root) return true
    current = current.parent
  }
  return false
}

function isBodyMesh(object: THREE.Object3D) {
  return object instanceof THREE.SkinnedMesh && /(?:^|_)Body(?:$|[_\.\d])/i.test(object.name)
}

function previewMeshes(root: THREE.Object3D) {
  const skinnedMeshes: THREE.SkinnedMesh[] = []
  const visibleMeshes: THREE.Mesh[] = []
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !visibleInHierarchy(root, object)) return
    visibleMeshes.push(object)
    if (object instanceof THREE.SkinnedMesh) skinnedMeshes.push(object)
  })
  return skinnedMeshes.length ? skinnedMeshes : visibleMeshes
}

function meshBounds(mesh: THREE.Mesh, refreshPose = false) {
  const bounds = new THREE.Box3()
  try {
    if (refreshPose && mesh instanceof THREE.SkinnedMesh) mesh.computeBoundingBox()
    bounds.expandByObject(mesh)
  } catch {
    // A malformed source skin can contain a missing bone reference. Keep the
    // preview usable by falling back to the unskinned geometry bounds.
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
    if (mesh.geometry.boundingBox) bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld))
  }
  return bounds
}

/**
 * Skinned-mesh bounds are pose-dependent, but Three.js only computes their
 * frustum sphere on demand. Keep animated preview meshes drawable across
 * later poses instead of trusting a sphere cached from the first pose.
 */
export function disableSkinnedMeshFrustumCulling(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) object.frustumCulled = false
  })
}

/**
 * Effects exported alongside a character can sit far from the rig and must
 * not move the preview camera away from the character.
 */
export function previewBounds(root: THREE.Object3D, refreshPose = false) {
  const meshes = previewMeshes(root)
  if (!meshes.length) {
    const origin = root.getWorldPosition(new THREE.Vector3())
    return new THREE.Box3().setFromCenterAndSize(origin, new THREE.Vector3())
  }
  const bounds = new THREE.Box3()
  for (const mesh of meshes) bounds.union(meshBounds(mesh, refreshPose))
  return bounds
}

/**
 * Camera fit ignores meshes that occupy at most 0.5% of the visible body height
 * in the current pose. Tiny source-animated props remain rendered, but their
 * displaced bounding boxes cannot shrink the character in the preview.
 */
export function previewFitBounds(root: THREE.Object3D) {
  const body = bodyBounds(root)
  if (!body) return previewBounds(root)
  const bodyHeight = body.getSize(new THREE.Vector3()).y
  if (!(bodyHeight > 0)) return previewBounds(root)

  const threshold = bodyHeight * PREVIEW_TINY_MESH_RELATIVE_SIZE
  const bounds = body.clone()
  for (const mesh of previewMeshes(root)) {
    if (isBodyMesh(mesh)) continue
    const meshBound = meshBounds(mesh)
    const size = meshBound.getSize(new THREE.Vector3())
    if (Math.max(size.x, size.y, size.z) <= threshold) continue
    bounds.union(meshBound)
  }
  return bounds
}

function bodyBounds(root: THREE.Object3D) {
  const bodyMeshes: THREE.Object3D[] = []
  root.traverse((object) => {
    if (!isBodyMesh(object) || !visibleInHierarchy(root, object)) return
    // FBX2glTF preserves the source renderer name (for example CH0161_Body).
    // Keep the match narrow enough to avoid props whose names merely contain
    // the word "body" while allowing numbered/outlined body variants.
    bodyMeshes.push(object)
  })
  if (!bodyMeshes.length) return null
  const bounds = new THREE.Box3()
  for (const mesh of bodyMeshes) bounds.union(meshBounds(mesh as THREE.Mesh))
  return bounds.isEmpty() ? null : bounds
}

/**
 * Return the vertical ground plane for a preview. A detached skinned prop can
 * extend below the character and otherwise make the holder lift the whole
 * model above the platform. Only replace a materially negative outlier with
 * the body's lowest point; positive support props (chairs, floats, etc.) and
 * tiny exporter noise continue to use the full bounds.
 */
export function previewGround(root: THREE.Object3D, fallback: THREE.Box3) {
  const body = bodyBounds(root)
  if (!body) return fallback.min.y
  const separation = body.min.y - fallback.min.y
  return fallback.min.y < 0 && separation > 0.001 ? body.min.y : fallback.min.y
}

/**
 * Return the horizontal framing anchor for a preview. Equipment and effects
 * can be intentionally offset from the rig, so use the primary body mesh for
 * x/z centering while callers continue to use the full bounds for scale and
 * vertical placement.
 */
export function previewAnchor(root: THREE.Object3D, fallback: THREE.Box3) {
  return bodyBounds(root)?.getCenter(new THREE.Vector3()) ?? fallback.getCenter(new THREE.Vector3())
}
