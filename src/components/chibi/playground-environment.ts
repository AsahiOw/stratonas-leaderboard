import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function disposeObjects(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  root.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material)) } })
  materials.forEach(material => { if ('map' in material && material.map instanceof THREE.Texture) textures.add(material.map); material.dispose() })
  textures.forEach(texture => { texture.dispose(); if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) texture.image.close() }); geometries.forEach(geometry => geometry.dispose())
}

export function createPlaygroundEnvironment(scene: THREE.Scene) {
  const root = new THREE.Group(); scene.add(root)
  let disposed = false
  const ready = new GLTFLoader().loadAsync('/assets/playground/schale-office.glb?v=7d0cf76e').then(gltf => {
    if (disposed) { disposeObjects(gltf.scene); return }
    gltf.scene.traverse(object => {
      if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material.transparent) material.depthWrite = false
    })
    root.add(gltf.scene)
  })
  const selection = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.55, 32), new THREE.MeshBasicMaterial({ color: '#46b9df', side: THREE.DoubleSide, depthWrite: false }))
  selection.rotation.x = -Math.PI / 2; selection.position.y = 0.055; selection.visible = false; root.add(selection)
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.21, 24), new THREE.MeshBasicMaterial({ color: '#f59f77', side: THREE.DoubleSide, depthWrite: false }))
  marker.rotation.x = -Math.PI / 2; marker.position.y = 0.055; marker.visible = false; root.add(marker)
  return { root, selection, marker, ready, dispose: () => {
    disposed = true; disposeObjects(root); root.removeFromParent()
  } }
}
