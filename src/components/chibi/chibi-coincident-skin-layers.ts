import * as THREE from 'three'

function coincidentSubset(smaller: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, larger: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const tolerance = 1e-4, exactTolerance = 1e-6
  const buckets = new Map<string, number[]>()
  const cell = (value: number) => Math.floor(value / tolerance)
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`
  for (let index = 0; index < larger.count; index++) {
    const bucket = key(cell(larger.getX(index)), cell(larger.getY(index)), cell(larger.getZ(index)))
    const matches = buckets.get(bucket) ?? []
    matches.push(index)
    buckets.set(bucket, matches)
  }
  let exact = 0
  for (let index = 0; index < smaller.count; index++) {
    const x = smaller.getX(index), y = smaller.getY(index), z = smaller.getZ(index)
    const cx = cell(x), cy = cell(y), cz = cell(z)
    let nearest = Infinity
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      for (const candidate of buckets.get(key(cx + dx, cy + dy, cz + dz)) ?? []) {
        const distance = Math.max(Math.abs(x - larger.getX(candidate)), Math.abs(y - larger.getY(candidate)), Math.abs(z - larger.getZ(candidate)))
        if (distance < nearest) nearest = distance
      }
    }
    if (nearest >= tolerance) return false
    if (nearest < exactTolerance) exact++
  }
  return exact >= smaller.count * .75
}

export function separateCoincidentSkinLayers(root: THREE.Object3D) {
  const groups = new Map<string, THREE.SkinnedMesh[]>()
  root.traverse(object => {
    if (!(object instanceof THREE.SkinnedMesh) || !object.visible || Array.isArray(object.material)
      || !object.userData.chibi?.sourceReference || object.userData.chibi?.sourceDefaultVisible === false
      || object.skeleton.bones.length < 8 || !object.material.depthTest || !object.material.depthWrite
      || object.material.transparent || object.material.polygonOffsetFactor !== 0 || object.material.polygonOffsetUnits !== 0) return
    const key = [object.parent?.uuid, object.material.uuid, ...object.skeleton.bones.map(bone => bone.uuid).sort()].join(':')
    groups.set(key, [...(groups.get(key) ?? []), object])
  })
  let separated = 0
  for (const group of groups.values()) {
    if (group.length !== 2) continue
    const [first, second] = group
    const firstPosition = first.geometry.getAttribute('position'), secondPosition = second.geometry.getAttribute('position')
    if (!firstPosition || !secondPosition || firstPosition.count === secondPosition.count) continue
    const [overlay, small, large] = firstPosition.count < secondPosition.count
      ? [first, firstPosition, secondPosition] : [second, secondPosition, firstPosition]
    if (!coincidentSubset(small, large)) continue
    const material = (overlay.material as THREE.Material).clone()
    material.polygonOffset = true
    material.polygonOffsetFactor = -2
    material.polygonOffsetUnits = -2
    overlay.material = material
    separated++
  }
  return separated
}
