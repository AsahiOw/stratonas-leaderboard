'use client'

import { useEffect, useRef, useState } from 'react'
import { Layers, Maximize, Minimize, RotateCw } from 'lucide-react'
import styles from './ChibiViewer.module.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CHIBI_ACTIONS, type ChibiAction, type ChibiCatalogStudent } from '@/lib/chibi/types'
import { sourceObjectKey, type ChibiRenderingProfile } from '@/lib/chibi/rendering-profile'
import { mouthTileAtTime, mouthTileTextureTransform, mouthTileStateAtTime, normalizePlaybackTime } from '@/lib/chibi-mouth'
import { disableSkinnedMeshFrustumCulling, previewAnchor, previewBounds, previewFitBounds, previewGround } from '@/lib/chibi/preview-bounds'
import { applyChibiProfileMaterialState, createDsfxAdditivePass, createDsfxAlphaBlendAddPass, createDsfxGlitchTexPass, createDsfxMatcapPass, createMxCTransparentPasses, createMxEStandardPass, createMxUnlitOutlinePass, createProjectMxWeaponPasses, patchEyebrowCameraShader, type ChibiViewerMaterialMetadata } from './chibi-viewer-material'
import { alternateFaceVisibilityAtTime, inPlaceClip, rendererVisibilityAtTime } from './chibi-viewer-state'
import { CHIBI_MODEL_NODE_KEY, type ChibiArrangementDocument, type ChibiArrangementNode } from './chibi-arrangement'
import { captureChibiFaceLayer, chibiFaceLayerKey, chibiArrangementCorrectionMatrix, chibiArrangementRendererVisibility } from './chibi-viewer-arrangement'
import { createHaloFollower, type HaloFollowBinding } from './chibi-halo-follow'
import { separateCoincidentSkinLayers } from './chibi-coincident-skin-layers'
import { downloadChibiModel, type ModelDownloadProgress } from './chibi-model-download'

export type ChibiViewerModel = NonNullable<ChibiCatalogStudent['model']>
const labels: Record<ChibiAction, string> = { idle: 'Idle', walk: 'Walk', pickup: 'Pick up', touch: 'Touch' }
type MouthMaterial = THREE.Material & { map?: THREE.Texture | null; userData: { mouthTiles?: Record<string, readonly (readonly [number, number, boolean?])[]>; mouthAtlas?: { columns?: number; rows?: number; defaultTile?: number; scaleX?: number; scaleY?: number }; depthWrite?: boolean } }
type ChildRendererEvent = { clip: string; time: number; function: string; int: number }
type ChildRendererSlot = { id: number; nodes?: string[]; nodeIndices?: number[]; defaultVisible?: boolean }
type ChibiAssemblyRenderer = { name: string; enabled: boolean }
type ChibiAssembly = { renderers?: ChibiAssemblyRenderer[] }
type ChibiSceneData = { haloFollow?: { schemaVersion: 1; bindings: HaloFollowBinding[] }; rendererSlots?: ChildRendererSlot[]; rendererEvents?: ChildRendererEvent[]; assembly?: ChibiAssembly; renderingProfile?: ChibiRenderingProfile }

type MouthTransform = { offset: THREE.Vector2; repeat: THREE.Vector2 }

function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  const collectTextures = (value: unknown, seen: Set<object>) => {
    if (value instanceof THREE.Texture) { textures.add(value); return }
    if (!value || typeof value !== 'object') return
    if (seen.has(value)) return
    seen.add(value)
    Object.values(value).forEach((child) => collectTextures(child, seen))
  }
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      collectTextures(material, new Set<object>())
    }
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose()
  })
  geometries.forEach((value) => value.dispose())
  materials.forEach((value) => value.dispose())
  textures.forEach((value) => {
    const image = value.source.data
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close()
    value.dispose()
  })
}

function setMouthTile(material: MouthMaterial, clip: string, time: number) {
  const events = material.userData.mouthTiles?.[clip]
  if (!material.map) return
  const atlas = material.userData.mouthAtlas
  if (typeof atlas?.scaleX === 'number' && typeof atlas.scaleY === 'number') {
    const { tile, flipX: eventFlipX } = mouthTileStateAtTime(events ?? [], time, atlas.defaultTile ?? events?.[0]?.[1] ?? 0)
    const transform = mouthTileTextureTransform(tile, eventFlipX, atlas.columns || 8, atlas.rows || 8, atlas.scaleX, atlas.scaleY)
    material.map.repeat.set(...transform.repeat)
    material.map.offset.set(...transform.offset)
    material.map.needsUpdate = true
    return
  }
  if (!events?.length) return
  // A clip may begin with its first mouth event after t=0. Until that event,
  // preserve the source-authored atlas default instead of showing a later
  // reaction tile immediately on clip start.
  const tile = time < events[0][0] ? (atlas?.defaultTile ?? events[0][1]) : mouthTileAtTime(events, time)
  const base = atlas?.defaultTile ?? events[0][1]
  material.map.offset.set(((tile % 100) - (base % 100)) / (atlas?.columns || 8), (Math.floor(base / 100) - Math.floor(tile / 100)) / (atlas?.rows || 8))
}

function addEyebrowCameraCorrection(object: THREE.Mesh, material: THREE.Material, correction: number) {
  const data = material.userData as { chibiCameraUniforms?: { value: THREE.Vector3 }[] }
  data.chibiCameraUniforms ??= []
  const originalCompile = material.onBeforeCompile
  material.onBeforeCompile = function (shader, renderer) {
    originalCompile.call(this, shader, renderer)
    const cameraObject = { value: new THREE.Vector3() }
    data.chibiCameraUniforms!.push(cameraObject)
    shader.uniforms.chibiCameraObject = cameraObject
    shader.uniforms.chibiZCorrection = { value: correction }
    shader.vertexShader = patchEyebrowCameraShader(shader.vertexShader)
  }
  const originalCacheKey = material.customProgramCacheKey.bind(material)
  material.customProgramCacheKey = () => `${originalCacheKey()}|chibi-eyebrow-camera-v2:${correction}`
  const worldCamera = new THREE.Vector3()
  const previous = object.onBeforeRender.bind(object)
  object.onBeforeRender = function (renderer, scene, camera, geometry, drawnMaterial, group) {
    previous(renderer, scene, camera, geometry, drawnMaterial, group)
    if (drawnMaterial !== material) return
    camera.getWorldPosition(worldCamera)
    object.worldToLocal(worldCamera)
    for (const uniform of data.chibiCameraUniforms ?? []) uniform.value.copy(worldCamera)
  }
  material.needsUpdate = true
}


export function ChibiViewer({ model, className = '', showDiagnostics = true, arrangement: previewArrangement = null, arrangementDefault: previewDefault = null }: { model: ChibiViewerModel; className?: string; showDiagnostics?: boolean; arrangement?: ChibiArrangementDocument | null; arrangementDefault?: ChibiArrangementDocument | null }) {
  const arrangement = previewArrangement ?? model.arrangement ?? null
  const arrangementDefault = previewDefault ?? model.arrangementDefault ?? null
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const floorRef = useRef<THREE.Mesh | null>(null)
  const playRef = useRef<((action: ChibiAction) => void) | null>(null)
  const resetRef = useRef<(() => void) | null>(null)
  const arrangementRef = useRef<ChibiArrangementDocument | null>(arrangement)
  const arrangementDefaultRef = useRef<ChibiArrangementDocument | null>(arrangementDefault)
  const applyArrangementRef = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState('Loading model…')
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<ChibiAction | null>(null)
  const [missingClips, setMissingClips] = useState<Set<string>>(new Set())
  const [floorVisible, setFloorVisible] = useState(true)
  const floorVisibleRef = useRef(floorVisible)
  const [rotating, setRotating] = useState(false)
  const rotatingRef = useRef(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [holding, setHolding] = useState(false)
  const [download, setDownload] = useState<ModelDownloadProgress>({ loaded: 0, total: null })
  const [retryAttempt, setRetryAttempt] = useState(0)

  async function toggleFullscreen() {
    if (fullscreen) {
      if (document.fullscreenElement === viewerRef.current) await document.exitFullscreen()
      setFullscreen(false)
    } else {
      setFullscreen(true)
      // Keep the same immersive overlay on mobile browsers without this API.
      await viewerRef.current?.requestFullscreen?.().catch(() => { })
    }
  }

  useEffect(() => {
    const viewer = viewerRef.current
    const changed = () => setFullscreen(document.fullscreenElement === viewer)
    document.addEventListener('fullscreenchange', changed)
    return () => {
      document.removeEventListener('fullscreenchange', changed)
      if (document.fullscreenElement === viewer) void document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    if (!fullscreen) return
    const previousFocus = document.activeElement as HTMLElement | null
    const bodyOverflow = document.body.style.overflow, htmlOverflow = document.documentElement.style.overflow
    const background: { element: HTMLElement; inert: boolean }[] = []
    let branch = viewerRef.current as HTMLElement | null
    while (branch && branch !== document.body) {
      const parent: HTMLElement | null = branch.parentElement
      if (!parent) break
      for (const sibling of parent.children) if (sibling !== branch && sibling instanceof HTMLElement) {
        background.push({ element: sibling, inert: sibling.inert }); sibling.setAttribute('inert', '')
      }
      branch = parent
    }
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'
    viewerRef.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.fullscreenElement === viewerRef.current) void document.exitFullscreen()
        setFullscreen(false)
      }
      if (event.key !== 'Tab') return
      const buttons = [...(viewerRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
      const first = buttons[0], last = buttons.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === viewerRef.current)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === viewerRef.current)) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = htmlOverflow
      background.forEach(({ element, inert }) => element.toggleAttribute('inert', inert))
      previousFocus?.focus({ preventScroll: true })
    }
  }, [fullscreen])

  useEffect(() => { floorVisibleRef.current = floorVisible; if (floorRef.current) floorRef.current.visible = floorVisible }, [floorVisible])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    setStatus('Downloading model…'); setDownload({ loaded: 0, total: null }); setError(null); setActive(null); setMissingClips(new Set()); setHolding(false)
    const abortController = new AbortController()
    let disposed = false, frame = 0, root: THREE.Group | null = null, mixer: THREE.AnimationMixer | null = null
    let currentAction: THREE.AnimationAction | null = null, currentKind: ChibiAction | null = null
    let haloFollower: ReturnType<typeof createHaloFollower> | null = null
    let previewScale = 1, restingHolderY = 0
    const mouths: MouthMaterial[] = []
    const mouthTransforms = new Map<MouthMaterial, MouthTransform>()
    const rendererSlots = new Map<number, THREE.Object3D[]>()
    const rendererSlotDefaults = new Map<number, boolean>()
    const hiddenSceneMeshes: THREE.SkinnedMesh[] = []
    const profileRendererDefaults: { object: THREE.Object3D; visible: boolean; sourceReference: ChibiRenderingProfile['renderers'][number]['sourceReference'] }[] = []
    let rendererEvents: ChildRendererEvent[] = []
    let renderingProfile: ChibiRenderingProfile | null = null
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) }
    catch { setError('3D rendering is unavailable. Try a browser with WebGL enabled.'); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x151925, 0)
    renderer.domElement.setAttribute('aria-label', 'Interactive student model. Drag to rotate, scroll to zoom, or tap the student to react.')
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100), controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.enablePan = true; controls.minDistance = 0.5; controls.maxDistance = 12; controls.maxPolarAngle = Math.PI
    const resetCamera = () => { camera.position.set(0, 1.4, 4.5); controls.target.set(0, 0.9, 0); controls.update() }
    resetCamera(); scene.add(new THREE.HemisphereLight(0xffffff, 0x8891aa, 2.5))
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(2, 4, 5); scene.add(light)
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.035, 64), new THREE.MeshStandardMaterial({ color: 0x252d40, roughness: 1 })); pedestal.position.y = -0.03; scene.add(pedestal)
    floorRef.current = pedestal; pedestal.visible = floorVisibleRef.current
    const holder = new THREE.Group(); scene.add(holder)
    // Keep imported node transforms and animation tracks intact.  The admin
    // arrangement is applied to this wrapper (and to per-renderer wrappers)
    // after the mixer updates, so preview edits never rewrite the GLB.
    const arrangementGroup = new THREE.Group(); holder.add(arrangementGroup)
    const profileArrangementObjects = new Map<string, THREE.Object3D>()
    const profileArrangementWrappers = new Map<string, THREE.Group>()
    const profileAnimatedVisibility = new Map<string, boolean>()
    const faceLayers = new Map<THREE.Material, { key: string; apply: ReturnType<typeof captureChibiFaceLayer> }>()
    const arrangementSourceKey = (reference: ChibiRenderingProfile['renderers'][number]['sourceReference']) => reference
      ? `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.replaceAll('\\', '/').toLowerCase()}:${reference.objectId}` : ''
    const applyNodeDelta = (object: THREE.Object3D, node: ChibiArrangementNode | undefined, baseline: ChibiArrangementNode | undefined) => {
      object.matrixAutoUpdate = false
      object.matrix.copy(chibiArrangementCorrectionMatrix(baseline, node))
      object.matrixWorldNeedsUpdate = true
    }
    const ensureArrangementWrapper = (object: THREE.Object3D, key: string) => {
      const existing = profileArrangementWrappers.get(key)
      if (existing) return existing
      const parent = object.parent
      if (!parent) return null
      const index = parent.children.indexOf(object)
        ; (object.userData as { chibiArrangementOriginalParentType?: string }).chibiArrangementOriginalParentType = parent.type
      parent.remove(object)
      const wrapper = new THREE.Group()
      wrapper.name = `__chibi_arrangement_${key}`
      parent.add(wrapper)
      wrapper.add(object)
      if (index >= 0) {
        const currentIndex = parent.children.indexOf(wrapper)
        if (currentIndex >= 0) parent.children.splice(currentIndex, 1)
        parent.children.splice(Math.min(index, parent.children.length), 0, wrapper)
      }
      profileArrangementWrappers.set(key, wrapper)
      return wrapper
    }
    const applyArrangement = () => {
      const document = arrangementRef.current
      const defaultDocument = arrangementDefaultRef.current
      faceLayers.forEach(({ key, apply }) => apply(document?.nodes[key] ?? defaultDocument?.nodes[key]))
      const modelNode = document?.nodes[CHIBI_MODEL_NODE_KEY]
      const modelDefault = defaultDocument?.nodes[CHIBI_MODEL_NODE_KEY]
      applyNodeDelta(arrangementGroup, modelNode, modelDefault)
      arrangementGroup.visible = modelNode?.visible ?? modelDefault?.visible ?? true
      profileArrangementObjects.forEach((object, key) => {
        const node = document?.nodes[key]
        const baseline = defaultDocument?.nodes[key]
        if (!node && !baseline) {
          const wrapper = profileArrangementWrappers.get(key)
          if (wrapper) applyNodeDelta(wrapper, undefined, undefined)
          return
        }
        const wrapper = ensureArrangementWrapper(object, key)
        if (wrapper) applyNodeDelta(wrapper, node, baseline)
        const sourceVisible = profileRendererDefaults.find(renderer => arrangementSourceKey(renderer.sourceReference) === key)?.visible
        const animatedVisible = profileAnimatedVisibility.get(key) ?? sourceVisible
        const visible = chibiArrangementRendererVisibility(animatedVisible, node?.visible, baseline?.visible, sourceVisible)
        if (typeof visible === 'boolean') object.visible = visible
      })
    }
    applyArrangementRef.current = applyArrangement

    const resize = () => { const width = container.clientWidth, height = container.clientHeight; renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix() }
    const observer = new ResizeObserver(resize); observer.observe(container); resize()
    const raycaster = new THREE.Raycaster(), dragPlane = new THREE.Plane(), dragPoint = new THREE.Vector3(), dragOffset = new THREE.Vector3(), restingPosition = new THREE.Vector3()
    let down: { x: number; y: number; id: number; hit: THREE.Vector3 | null } | null = null
    let holdTimer: ReturnType<typeof setTimeout> | null = null, dragging = false
    let returnToIdle = () => { }
    const clearHoldTimer = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = null }
    const castPointer = (x: number, y: number) => {
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1), camera)
    }
    const releasePickup = () => {
      clearHoldTimer()
      if (dragging) {
        dragging = false; controls.enabled = true; holder.position.copy(restingPosition)
        setHolding(false); returnToIdle()
      }
    }
    const pointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) { releasePickup(); down = null; return }
      if (event.button !== 0 || !root) return
      castPointer(event.clientX, event.clientY)
      // Invisible source renderers must not act as hit targets.
      const hit = raycaster.intersectObject(root, true).find(hit => {
        let object: THREE.Object3D | null = hit.object
        while (object) { if (!object.visible) return false; object = object.parent }
        return true
      })
      down = { x: event.clientX, y: event.clientY, id: event.pointerId, hit: hit?.point.clone() ?? null }
      if (!hit || model.profile.interactions.pickup.state !== 'available') return
      holdTimer = setTimeout(() => {
        if (!down?.hit || disposed) return
        playRef.current?.('pickup')
        if (currentKind !== 'pickup') return
        dragging = true; controls.enabled = false; setHolding(true)
        dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), down.hit)
        dragOffset.copy(holder.position).sub(down.hit)
      }, 300)
    }
    const pointerMove = (event: PointerEvent) => {
      if (!down || event.pointerId !== down.id) return
      if (!dragging) {
        if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) { clearHoldTimer(); down.hit = null }
        return
      }
      event.stopImmediatePropagation()
      castPointer(event.clientX, event.clientY)
      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) holder.position.copy(dragPoint).add(dragOffset)
    }
    const pointerUp = (event: PointerEvent) => {
      if (!down || event.pointerId !== down.id) return
      const start = down, wasDragging = dragging
      down = null; releasePickup()
      if (!wasDragging && start.hit && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6) playRef.current?.('touch')
    }
    const pointerCancel = () => { down = null; releasePickup() }
    const contextMenu = (event: Event) => event.preventDefault()
    // Capture precedes OrbitControls, so a held character can move independently.
    renderer.domElement.addEventListener('pointerdown', pointerDown, true)
    renderer.domElement.addEventListener('pointermove', pointerMove, true)
    renderer.domElement.addEventListener('pointerup', pointerUp, true)
    renderer.domElement.addEventListener('pointercancel', pointerCancel, true)
    renderer.domElement.addEventListener('lostpointercapture', pointerCancel)
    renderer.domElement.addEventListener('contextmenu', contextMenu)
    window.addEventListener('blur', pointerCancel)
    const visibilityChanged = () => { if (document.hidden) pointerCancel() }
    document.addEventListener('visibilitychange', visibilityChanged)
    const updateRendererState = () => {
      if (renderingProfile) {
        const clip = currentAction?.getClip()
        const visibility = clip ? rendererVisibilityAtTime(
          profileRendererDefaults.flatMap(({ sourceReference, visible }) => sourceReference
            ? [{ sourceReference, defaultVisible: visible }]
            : []),
          renderingProfile.childRendererEvents ?? [],
          clip.name,
          currentAction?.time ?? 0,
          clip.duration,
          currentAction?.loop === THREE.LoopRepeat,
        ) : null
        profileRendererDefaults.forEach(({ object, visible, sourceReference }) => {
          const visibilityKey = sourceReference ? sourceObjectKey(sourceReference) : ''
          const arrangementKey = sourceReference ? arrangementSourceKey(sourceReference) : ''
          const animatedVisible = visibility && visibilityKey ? visibility.get(visibilityKey) ?? visible : visible
          if (arrangementKey) profileAnimatedVisibility.set(arrangementKey, animatedVisible)
          object.visible = animatedVisible
        })
      } else rendererSlots.forEach((objects, id) => objects.forEach((object) => { object.visible = rendererSlotDefaults.get(id) ?? true }))
      if (!currentAction) return
      if (renderingProfile) return
      const clip = currentAction.getClip()
      const visibility = alternateFaceVisibilityAtTime(rendererSlotDefaults, rendererEvents,
        clip.name, currentAction.time, clip.duration, currentAction.loop === THREE.LoopRepeat)
      rendererSlots.forEach((objects, id) => objects.forEach(object => { object.visible = visibility.get(id) ?? true }))
    }
    const updateMouths = () => {
      if (currentAction) {
        const clip = currentAction.getClip()
        const time = normalizePlaybackTime(currentAction.time, clip.duration, currentAction.loop === THREE.LoopRepeat)
        for (const mouth of mouths) setMouthTile(mouth, clip.name, time)
      }
      updateRendererState()
    }

    const load = async () => {
      try {
        let lastProgressTime = 0
        const buffer = await downloadChibiModel(model.url, abortController.signal, progress => {
          const now = performance.now()
          if (!disposed && (progress.loaded === 0 || progress.loaded === progress.total || now - lastProgressTime >= 100)) {
            setDownload(progress); lastProgressTime = now
          }
        })
        if (disposed) return
        setStatus('Preparing model…')
        const resourcePath = new URL('.', new URL(model.url, window.location.href)).href
        const gltf = await new GLTFLoader().parseAsync(buffer, resourcePath)
        if (disposed) { disposeModel(gltf.scene); return }
        root = gltf.scene
        root.traverse(object => {
          if (!(object instanceof THREE.SkinnedMesh)) return
          for (const bone of object.skeleton.bones) {
            let ancestor: THREE.Object3D | null = bone
            while (ancestor) {
              if (ancestor.name === 'prop_cafe_root') { hiddenSceneMeshes.push(object); object.visible = false; return }
              ancestor = ancestor.parent
            }
          }
        })
        const sceneData = (root.userData as { chibi?: ChibiSceneData }).chibi
        if (sceneData?.haloFollow?.schemaVersion === 1) {
          const objects = new Map<number, THREE.Object3D[]>()
          root.traverse(object => {
            const index = gltf.parser.associations.get(object)?.nodes
            if (index !== undefined) objects.set(index, [...(objects.get(index) ?? []), object])
          })
          haloFollower = createHaloFollower(root, sceneData.haloFollow.bindings, objects)
        }
        renderingProfile = sceneData?.renderingProfile ?? null
        if (renderingProfile) {
          const objectsByNode = new Map<number, THREE.Object3D[]>()
          const materialsByIndex = new Map<number, THREE.Material[]>()
          root.traverse((object) => {
            const association = gltf.parser.associations.get(object)
            if (Number.isInteger(association?.nodes)) {
              const objects = objectsByNode.get(association!.nodes!) ?? []
              objects.push(object)
              objectsByNode.set(association!.nodes!, objects)
            }
            if (!(object instanceof THREE.Mesh)) return
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
              const materialIndex = gltf.parser.associations.get(material)?.materials
              if (!Number.isInteger(materialIndex)) continue
              const matches = materialsByIndex.get(materialIndex!) ?? []
              if (!matches.includes(material)) matches.push(material)
              materialsByIndex.set(materialIndex!, matches)
            }
          })
          for (const sourceRenderer of renderingProfile.renderers) {
            if (!Number.isInteger(sourceRenderer.glbNodeIndex)) throw new Error(`Renderer ${sourceRenderer.hierarchyPath} has no exported node binding.`)
            const objects = objectsByNode.get(sourceRenderer.glbNodeIndex!) ?? []
            if (objects.length !== 1) throw new Error(`Renderer node ${sourceRenderer.glbNodeIndex} resolves to ${objects.length} Three.js objects.`)
            objects[0].visible = sourceRenderer.defaultVisible
            if (!sourceRenderer.sourceReference) throw new Error(`Renderer ${sourceRenderer.hierarchyPath} has no source reference.`)
            const sourceKey = arrangementSourceKey(sourceRenderer.sourceReference)
            if (sourceKey) {
              profileArrangementObjects.set(sourceKey, objects[0])
              profileAnimatedVisibility.set(sourceKey, sourceRenderer.defaultVisible)
            }
            profileRendererDefaults.push({ object: objects[0], visible: sourceRenderer.defaultVisible, sourceReference: sourceRenderer.sourceReference })
          }
          if (renderingProfile.mouth) {
            const mouthMaterials = materialsByIndex.get(renderingProfile.mouth.glbMaterialIndex ?? -1) ?? []
            const mouthMaterial = mouthMaterials.find(material => 'map' in material && material.userData.mouthTiles) as MouthMaterial | undefined
            if (!mouthMaterial) throw new Error('Exported mouth material association is missing from the rendering profile.')
            mouths.push(mouthMaterial)
            if (mouthMaterial.map) mouthTransforms.set(mouthMaterial, { offset: mouthMaterial.map.offset.clone(), repeat: mouthMaterial.map.repeat.clone() })
          }
        } else {
          root.traverse((object) => {
            const visible = object.userData.chibi?.inferredInitialVisible ?? object.userData.chibi?.sourceDefaultVisible
            if (typeof visible === 'boolean') object.visible = visible
          })
          for (const sourceRenderer of sceneData?.assembly?.renderers ?? []) {
            root.traverse((object) => { if (object.name === sourceRenderer.name && typeof object.userData.chibi?.inferredInitialVisible !== 'boolean') object.visible = sourceRenderer.enabled })
          }
          rendererEvents = [...(sceneData?.rendererEvents ?? [])].sort((left, right) => left.time - right.time)
          for (const slot of sceneData?.rendererSlots ?? []) {
            const objects = slot.nodeIndices ? slot.nodeIndices.flatMap((index) => {
              const matches: THREE.Object3D[] = []
              root?.traverse(object => { if (gltf.parser.associations.get(object)?.nodes === index) matches.push(object) })
              return matches.length === 1 ? matches : []
            }) : (slot.nodes ?? []).flatMap((name) => {
              const object = root?.getObjectByName(name)
              return object ? [object] : []
            })
            if (objects.length) {
              rendererSlots.set(slot.id, objects)
              rendererSlotDefaults.set(slot.id, slot.defaultVisible ?? true)
            }
          }
        }
        hiddenSceneMeshes.forEach(object => { object.visible = false })
        if (renderingProfile) {
          const maskRequests: { material: THREE.Material; textureIndex: number }[] = []
          const projectMxTextureRequests: { material: THREE.Material; textureIndex: number; property: 'mainTex' | 'sourceTex' }[] = []
          const eStandardTextureRequests: { material: THREE.Material; textureIndex: number }[] = []
          const glitchTextureRequests: { material: THREE.Material; textureIndex: number }[] = []
          const matcapTextureRequests: { material: THREE.Material; textureIndex: number; property: 'mainTex' | 'matcapTex' }[] = []
          root.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
              const metadata = (material.userData as { chibi?: ChibiViewerMaterialMetadata }).chibi
              const index = metadata?.adapterId === 'mx-c-transparent-st' ? metadata.maskTexture?.index : undefined
              if (Number.isInteger(index)) maskRequests.push({ material, textureIndex: Number(index) })
              if (metadata?.adapterId === 'projectmx-weapon-test1-damage') {
                const projectMxTextures = metadata.projectMxTextures
                for (const property of ['mainTex', 'sourceTex'] as const) {
                  const textureIndex = projectMxTextures?.[property]?.index
                  if (Number.isInteger(textureIndex)) projectMxTextureRequests.push({ material, textureIndex: Number(textureIndex), property })
                }
              }
              if (metadata?.adapterId === 'mx-e-standard') {
                const textureIndex = metadata.eStandardTextures?.mainTex?.index
                if (Number.isInteger(textureIndex)) eStandardTextureRequests.push({ material, textureIndex: Number(textureIndex) })
              }
              if (metadata?.adapterId === 'dsfx-glitch-tex') {
                const textureIndex = metadata.glitchTextures?.noiseTex?.index
                if (Number.isInteger(textureIndex)) glitchTextureRequests.push({ material, textureIndex: Number(textureIndex) })
              }
              if (metadata?.adapterId === 'dsfx-matcap') {
                const matcapTextures = metadata.matcapTextures
                for (const property of ['mainTex', 'matcapTex'] as const) {
                  const textureIndex = matcapTextures?.[property]?.index
                  if (Number.isInteger(textureIndex)) matcapTextureRequests.push({ material, textureIndex: Number(textureIndex), property })
                }
              }
            }
          })
          await Promise.all(maskRequests.map(async ({ material, textureIndex }) => {
            const texture = await gltf.parser.getDependency('texture', textureIndex)
            if (!(texture instanceof THREE.Texture)) throw new Error('MX/C-Transparent-ST mask texture dependency is missing.')
              ; (material.userData as { chibiMaskTexture?: THREE.Texture }).chibiMaskTexture = texture
          }))
          await Promise.all(projectMxTextureRequests.map(async ({ material, textureIndex, property }) => {
            const texture = await gltf.parser.getDependency('texture', textureIndex)
            if (!(texture instanceof THREE.Texture)) throw new Error(`ProjectMX/WeaponTest1Damage ${property} texture dependency is missing.`)
            const userData = material.userData as { chibiProjectMxTextures?: { mainTex?: THREE.Texture; sourceTex?: THREE.Texture } }
            userData.chibiProjectMxTextures ??= {}
            userData.chibiProjectMxTextures[property] = texture
          }))
          await Promise.all(eStandardTextureRequests.map(async ({ material, textureIndex }) => {
            const texture = await gltf.parser.getDependency('texture', textureIndex)
            if (!(texture instanceof THREE.Texture)) throw new Error('MX/E-Standard _MainTex texture dependency is missing.')
              ; (material.userData as { chibiEStandardTextures?: { mainTex?: THREE.Texture } }).chibiEStandardTextures = { mainTex: texture }
          }))
          await Promise.all(glitchTextureRequests.map(async ({ material, textureIndex }) => {
            const texture = await gltf.parser.getDependency('texture', textureIndex)
            if (!(texture instanceof THREE.Texture)) throw new Error('DSFX/FX_SHADER_Glitch_Tex _NoiseTex texture dependency is missing.')
              ; (material.userData as { chibiGlitchTextures?: { noiseTex?: THREE.Texture } }).chibiGlitchTextures = { noiseTex: texture }
          }))
          await Promise.all(matcapTextureRequests.map(async ({ material, textureIndex, property }) => {
            const texture = await gltf.parser.getDependency('texture', textureIndex)
            if (!(texture instanceof THREE.Texture)) throw new Error(`DSFX/FX_SHADER_Matcap ${property} texture dependency is missing.`)
            const userData = material.userData as { chibiMatcapTextures?: { mainTex?: THREE.Texture; matcapTex?: THREE.Texture } }
            userData.chibiMatcapTextures ??= {}
            userData.chibiMatcapTextures[property] = texture
          }))
        }
        disableSkinnedMeshFrustumCulling(root)
        const mxOutlineJobs: { object: THREE.Mesh; material: THREE.Material; metadata: ChibiViewerMaterialMetadata }[] = []
        const mxTransparentJobs: { object: THREE.Mesh; material: THREE.Material; metadata: ChibiViewerMaterialMetadata }[] = []
        const projectMxJobs: { object: THREE.Mesh; material: THREE.Material; metadata: ChibiViewerMaterialMetadata }[] = []
        const eStandardJobs: { object: THREE.Mesh; material: THREE.Material; metadata: ChibiViewerMaterialMetadata }[] = []
        const additiveJobs: { object: THREE.Mesh; material: THREE.Material; metadata: ChibiViewerMaterialMetadata }[] = []
        const alphaBlendAddJobs: { object: THREE.Mesh; material: THREE.Material; metadata: ChibiViewerMaterialMetadata }[] = []
        const glitchJobs: { object: THREE.Mesh; material: THREE.Material; metadata: ChibiViewerMaterialMetadata }[] = []
        const matcapJobs: { object: THREE.Mesh; material: THREE.Material; metadata: ChibiViewerMaterialMetadata }[] = []
        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          if (object.userData.chibiOutlinePass) return
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            const metadata = material.userData as { depthWrite?: unknown; depthTest?: unknown; chibi?: ChibiViewerMaterialMetadata & { zCorrection?: unknown; drawLayer?: unknown; adapterId?: unknown }; mouthTiles?: unknown }
            const depthWrite = metadata.depthWrite ?? metadata.chibi?.depthWrite
            if (typeof depthWrite === 'boolean') material.depthWrite = depthWrite
            const depthTest = metadata.depthTest ?? metadata.chibi?.depthTest
            if (typeof depthTest === 'boolean') material.depthTest = depthTest
            const renderOrder = metadata.chibi?.renderOrder
            if (typeof renderOrder === 'number') object.renderOrder = Math.max(object.renderOrder, renderOrder)
            if (renderingProfile) {
              if (metadata.chibi?.adapterId === 'dsfx-static') applyChibiProfileMaterialState(material, metadata.chibi)
              if (metadata.chibi?.adapterId === 'dsfx-static'
                && metadata.chibi.sourceShaderReference
                && String((metadata.chibi.sourceShaderReference as { objectId?: unknown }).objectId) === '-4115771715742154417') additiveJobs.push({ object, material, metadata: metadata.chibi })
              if (metadata.chibi?.adapterId === 'dsfx-static'
                && metadata.chibi.sourceShaderReference
                && String((metadata.chibi.sourceShaderReference as { objectId?: unknown }).objectId) === '3898777625326355543') alphaBlendAddJobs.push({ object, material, metadata: metadata.chibi })
              if (metadata.chibi?.adapterId === 'mx-unlit-outline') mxOutlineJobs.push({ object, material, metadata: metadata.chibi })
              if (metadata.chibi?.adapterId === 'mx-c-transparent-st') mxTransparentJobs.push({ object, material, metadata: metadata.chibi })
              if (metadata.chibi?.adapterId === 'projectmx-weapon-test1-damage') projectMxJobs.push({ object, material, metadata: metadata.chibi })
              if (metadata.chibi?.adapterId === 'mx-e-standard') eStandardJobs.push({ object, material, metadata: metadata.chibi })
              if (metadata.chibi?.adapterId === 'dsfx-glitch-tex') glitchJobs.push({ object, material, metadata: metadata.chibi })
              if (metadata.chibi?.adapterId === 'dsfx-matcap') matcapJobs.push({ object, material, metadata: metadata.chibi })
              const depthFunctions: Record<string, number> = {
                disabled: THREE.AlwaysDepth, never: THREE.NeverDepth, less: THREE.LessDepth, equal: THREE.EqualDepth,
                'less-equal': THREE.LessEqualDepth, greater: THREE.GreaterDepth, 'not-equal': THREE.NotEqualDepth,
                'greater-equal': THREE.GreaterEqualDepth, always: THREE.AlwaysDepth,
              }
              if (typeof metadata.chibi?.depthFunction === 'string' && depthFunctions[metadata.chibi.depthFunction] !== undefined) material.depthFunc = depthFunctions[metadata.chibi.depthFunction]
              if (metadata.chibi?.cullMode === 'off') material.side = THREE.DoubleSide
              else if (metadata.chibi?.cullMode === 'front') material.side = THREE.BackSide
              else if (metadata.chibi?.cullMode === 'back') material.side = THREE.FrontSide
              if (metadata.chibi?.adapterId === 'mx-character-eyebrow' && typeof metadata.chibi.zCorrection === 'number') {
                addEyebrowCameraCorrection(object, material, metadata.chibi.zCorrection)
              }
            }
            // EyeMouth is authored as an alpha-tested sprite but may share a
            // mesh with the opaque Face primitive. Mark this late layer as
            // transparent so Three.js renders it after the opaque face while
            // retaining the alphaTest cutout from the GLTF MASK material.
            if (!renderingProfile && (metadata.chibi?.depthTest === false || (depthTest === undefined && /EyeMouth/i.test(material.name ?? '')))) {
              material.depthTest = false
              material.depthWrite = false
              material.side = THREE.DoubleSide
              object.renderOrder = Math.max(object.renderOrder, typeof renderOrder === 'number' ? renderOrder : 20)
              material.transparent = true
              material.needsUpdate = true
            }
            const polygonOffsetFactor = metadata.chibi?.polygonOffsetFactor
            const polygonOffsetUnits = metadata.chibi?.polygonOffsetUnits
            if (typeof polygonOffsetFactor === 'number' && typeof polygonOffsetUnits === 'number') {
              material.polygonOffset = true
              material.polygonOffsetFactor = polygonOffsetFactor
              material.polygonOffsetUnits = polygonOffsetUnits
              material.needsUpdate = true
            }
            if (metadata.mouthTiles && 'map' in material) {
              const mouth = material as MouthMaterial
              if (!renderingProfile && !mouths.includes(mouth)) mouths.push(mouth)
              if (!renderingProfile && mouth.map) mouthTransforms.set(mouth, { offset: mouth.map.offset.clone(), repeat: mouth.map.repeat.clone() })
            }
          }
        })
        for (const { object, material, metadata } of mxOutlineJobs) {
          const outline = createMxUnlitOutlinePass(object, material, metadata)
          if (!outline) throw new Error('MX/Unlit Outline viewer adapter did not create its second pass.')
          object.add(outline)
        }
        for (const { object, material, metadata } of mxTransparentJobs) {
          const passes = createMxCTransparentPasses(object, material, metadata)
          if (!passes) throw new Error('MX/C-Transparent-ST viewer adapter did not create its forward/depth draws.')
          if (Array.isArray(object.material)) {
            const materials = [...object.material]
            const index = materials.indexOf(material)
            if (index < 0) throw new Error('MX/C-Transparent-ST source material is not bound to its source primitive.')
            materials[index] = passes.forward
            object.material = materials
          } else object.material = passes.forward
          object.geometry = passes.forwardGeometry
          object.add(passes.depthMesh)
        }
        for (const { object, material, metadata } of projectMxJobs) {
          const passes = createProjectMxWeaponPasses(object, material, metadata)
          if (!passes) throw new Error('ProjectMX/WeaponTest1Damage viewer adapter did not create its source forward/outline draws.')
          if (Array.isArray(object.material)) {
            const materials = [...object.material]
            const index = materials.indexOf(material)
            if (index < 0) throw new Error('ProjectMX/WeaponTest1Damage source material is not bound to its source primitive.')
            materials[index] = passes.forward
            object.material = materials
          } else object.material = passes.forward
          object.geometry = passes.forwardGeometry
          if (passes.outline) object.add(passes.outline)
        }
        for (const { object, material, metadata } of eStandardJobs) {
          const passes = createMxEStandardPass(object, material, metadata)
          if (!passes) throw new Error('MX/E-Standard viewer adapter did not create its source ForwardLit draw.')
          if (Array.isArray(object.material)) {
            const materials = [...object.material]
            const index = materials.indexOf(material)
            if (index < 0) throw new Error('MX/E-Standard source material is not bound to its source primitive.')
            materials[index] = passes.forward
            object.material = materials
          } else object.material = passes.forward
          object.geometry = passes.forwardGeometry
        }
        for (const { object, material, metadata } of additiveJobs) {
          const passes = createDsfxAdditivePass(object, material, metadata)
          if (!passes) throw new Error('DSFX/FX_SHADER_Additive_0 viewer adapter did not create its source Forward draw.')
          if (Array.isArray(object.material)) {
            const materials = [...object.material]
            const index = materials.indexOf(material)
            if (index < 0) throw new Error('DSFX/FX_SHADER_Additive_0 source material is not bound to its source primitive.')
            materials[index] = passes.forward
            object.material = materials
          } else object.material = passes.forward
          object.geometry = passes.forwardGeometry
        }
        for (const { object, material, metadata } of alphaBlendAddJobs) {
          const passes = createDsfxAlphaBlendAddPass(object, material, metadata)
          if (!passes) throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer adapter did not create its source Forward draw.')
          if (Array.isArray(object.material)) {
            const materials = [...object.material]
            const index = materials.indexOf(material)
            if (index < 0) throw new Error('DSFX/FX_SHADER_AlphaBlend_Add source material is not bound to its source primitive.')
            materials[index] = passes.forward
            object.material = materials
          } else object.material = passes.forward
          object.geometry = passes.forwardGeometry
        }
        for (const { object, material, metadata } of glitchJobs) {
          const passes = createDsfxGlitchTexPass(object, material, metadata)
          if (!passes) throw new Error('DSFX/FX_SHADER_Glitch_Tex viewer adapter did not create its source Forward draw.')
          if (Array.isArray(object.material)) {
            const materials = [...object.material]
            const index = materials.indexOf(material)
            if (index < 0) throw new Error('DSFX/FX_SHADER_Glitch_Tex source material is not bound to its source primitive.')
            materials[index] = passes.forward
            object.material = materials
          } else object.material = passes.forward
          object.geometry = passes.forwardGeometry
        }
        for (const { object, material, metadata } of matcapJobs) {
          const passes = createDsfxMatcapPass(object, material, metadata)
          if (!passes) throw new Error('DSFX/FX_SHADER_Matcap viewer adapter did not create its source Forward draw.')
          if (Array.isArray(object.material)) {
            const materials = [...object.material]
            const index = materials.indexOf(material)
            if (index < 0) throw new Error('DSFX/FX_SHADER_Matcap source material is not bound to its source primitive.')
            materials[index] = passes.forward
            object.material = materials
          } else object.material = passes.forward
          object.geometry = passes.forwardGeometry
        }
        root.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            const key = chibiFaceLayerKey(material, !!renderingProfile)
            if (key && !faceLayers.has(material)) faceLayers.set(material, { key, apply: captureChibiFaceLayer(material) })
          }
        })
        separateCoincidentSkinLayers(root)
        arrangementGroup.add(root); mixer = new THREE.AnimationMixer(root)
        const clips = new Map(gltf.animations.map((clip) => [clip.name, clip])), inPlaceClips = new Map<string, THREE.AnimationClip>(), missing = new Set<string>()
        for (const action of CHIBI_ACTIONS) { const interaction = model.profile.interactions[action]; if (interaction.state === 'available' && (!interaction.clip || !clips.has(interaction.clip))) missing.add(action) }
        setMissingClips(missing)
        const playClip = (clipName: string, kind: ChibiAction | null, settings?: { loop?: boolean; hold?: boolean; speed?: number }) => {
          const source = clips.get(clipName)
          if (!source || !mixer || !root) return false
          currentAction?.stop()
          haloFollower?.reset()
          let playbackClip = source
          if (kind === 'walk') {
            playbackClip = inPlaceClips.get(source.name) || inPlaceClip(source, root)
            inPlaceClips.set(source.name, playbackClip)
          }
          const next = mixer.clipAction(playbackClip).reset()
          next.setEffectiveTimeScale(settings?.speed || 1)
          next.setLoop((kind === 'pickup' || (settings?.loop ?? (kind === 'idle' || kind === 'walk'))) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
          next.clampWhenFinished = kind === 'pickup' ? false : settings?.hold ?? false; next.play(); currentAction = next; currentKind = kind; setActive(kind)
          if (kind !== 'pickup') holder.position.y = restingHolderY
          mouthTransforms.forEach((transform, mouth) => { mouth.map?.offset.copy(transform.offset); mouth.map?.repeat.copy(transform.repeat) })
          updateMouths()
          return true
        }
        const playInitial = () => {
          const idle = model.profile.interactions.idle, preferred = model.profile.initialPose || (idle.state === 'available' ? idle.clip : null)
          if (preferred && playClip(preferred, preferred === idle.clip ? 'idle' : null, idle)) return
          currentAction?.stop(); currentAction = null; currentKind = null; setActive(null)
          mouthTransforms.forEach((transform, mouth) => { mouth.map?.offset.copy(transform.offset); mouth.map?.repeat.copy(transform.repeat) })
          updateRendererState()
        }
        const play = (kind: ChibiAction) => { const interaction = model.profile.interactions[kind]; if (interaction.state === 'available' && interaction.clip && !missing.has(kind)) playClip(interaction.clip, kind, interaction) }
        playRef.current = play
        mixer.addEventListener('finished', () => { if (currentKind === 'touch') playInitial() })
        returnToIdle = playInitial
        playInitial(); resetRef.current = () => { pointerCancel(); holder.rotation.y = 0; holder.position.copy(restingPosition); resetCamera(); playInitial() }; mixer.update(0); root.updateMatrixWorld(true)
        const bounds = previewBounds(root), fitBounds = previewFitBounds(root), size = fitBounds.getSize(new THREE.Vector3()), anchor = previewAnchor(root, bounds), ground = previewGround(root, bounds), scale = 1.8 / Math.max(size.y, 0.01)
        previewScale = scale; restingHolderY = -ground * scale
        holder.scale.setScalar(scale); holder.position.set(-anchor.x * scale, restingHolderY, -anchor.z * scale); restingPosition.copy(holder.position); applyArrangement(); setStatus('Model ready')
      } catch (cause) {
        if (!disposed && !(cause instanceof DOMException && cause.name === 'AbortError')) setError('The model could not be loaded. Check your connection and try again.')
      }
    }
    void load()
    let previousTime = 0, elapsedSeconds = 0
    const render = (time: number) => {
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0
      previousTime = time
      if (!document.hidden) {
        elapsedSeconds += delta
        scene.userData.chibiElapsedSeconds = elapsedSeconds
        mixer?.update(delta)
        // Formation pickup poses can crouch or sit below the platform even
        // when the standing pose is grounded. Reposition only that held pose
        // from its current lowest rendered point; idle/walk retain the stable
        // initial framing and support furniture is not moved.
        if (!dragging && currentKind === 'pickup' && root && previewScale > 0) {
          holder.updateMatrixWorld(true)
          const poseBounds = previewBounds(root, true), poseGround = previewGround(root, poseBounds)
          const localGround = (poseGround - holder.position.y) / previewScale
          holder.position.y = -localGround * previewScale
        } else if (!dragging && holder.position.y !== restingHolderY) holder.position.y = restingHolderY
        if (!dragging) {
          if (rotatingRef.current) holder.rotation.y = (holder.rotation.y - delta * Math.PI / 5) % (Math.PI * 2)
          const angle = holder.rotation.y
          holder.position.x = restingPosition.x * Math.cos(angle) + restingPosition.z * Math.sin(angle)
          holder.position.z = -restingPosition.x * Math.sin(angle) + restingPosition.z * Math.cos(angle)
        }
        updateMouths(); applyArrangement(); haloFollower?.update(delta, currentAction?.getClip() ?? null); hiddenSceneMeshes.forEach(object => { object.visible = false }); controls.update(delta); renderer.render(scene, camera)
      }
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => {
      disposed = true; abortController.abort(); cancelAnimationFrame(frame); observer.disconnect()
      clearHoldTimer(); window.removeEventListener('blur', pointerCancel); document.removeEventListener('visibilitychange', visibilityChanged)
      renderer.domElement.removeEventListener('pointerdown', pointerDown, true); renderer.domElement.removeEventListener('pointermove', pointerMove, true); renderer.domElement.removeEventListener('pointerup', pointerUp, true); renderer.domElement.removeEventListener('pointercancel', pointerCancel, true); renderer.domElement.removeEventListener('lostpointercapture', pointerCancel)
      renderer.domElement.removeEventListener('contextmenu', contextMenu)
      floorRef.current = null
      controls.dispose(); mixer?.stopAllAction(); if (root) mixer?.uncacheRoot(root); disposeModel(scene); renderer.dispose(); renderer.domElement.remove(); playRef.current = null; resetRef.current = null; applyArrangementRef.current = null
    }
  }, [model, retryAttempt])

  useEffect(() => {
    arrangementRef.current = arrangement
    arrangementDefaultRef.current = arrangementDefault
    applyArrangementRef.current?.()
  }, [arrangement, arrangementDefault])

  return <div ref={viewerRef} tabIndex={-1} role={fullscreen ? 'dialog' : undefined} aria-modal={fullscreen || undefined} aria-label={fullscreen ? 'Student model fullscreen' : undefined} className={`overflow-hidden rounded-2xl border border-white/10 bg-[#151925] ${className} ${fullscreen ? styles.fullscreen : ''}`}>
    <div data-chibi-stage className="relative">
      <div data-chibi-canvas ref={containerRef} className="h-[420px] w-full sm:h-[560px]" />
      {!error && status !== 'Model ready' && <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#151925]/95 p-5 text-center">
          <p role="status" className="text-sm text-slate-200">{status}</p>
          {status === 'Downloading model…' && <>
            <progress aria-label="Model download progress" max={download.total ?? undefined} value={download.total ? Math.min(download.loaded, download.total) : undefined} className="mt-3 h-2 w-full accent-cyan-300" />
            <p className="mt-2 text-xs text-slate-400">{download.total ? `${Math.min(100, Math.floor(download.loaded / download.total * 100))}% · ${(download.loaded / 1_000_000).toFixed(1)} / ${(download.total / 1_000_000).toFixed(1)} MB` : `${(download.loaded / 1_000_000).toFixed(1)} MB downloaded`}</p>
          </>}
        </div>
      </div>}
      <div className={styles.toolbar}>
        <button type="button" className={styles.rotation} aria-label={rotating ? 'Stop rotation' : 'Start slow rotation'} aria-pressed={rotating} title={rotating ? 'Stop rotation' : 'Start slow rotation'} onClick={() => { rotatingRef.current = !rotating; setRotating(!rotating) }}><RotateCw size={18} /></button>
        <button type="button" aria-label={floorVisible ? 'Hide floor' : 'Show floor'} aria-pressed={floorVisible} title={floorVisible ? 'Hide floor' : 'Show floor'} onClick={() => setFloorVisible(value => !value)}><Layers size={18} /></button>
        <button type="button" className={styles.reset} onClick={() => resetRef.current?.()}>Reset view</button>
        <button type="button" aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
      </div>
      {error && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#151925]/95 p-6 text-center text-sm text-rose-200">
        <p>{showDiagnostics ? error : 'This student could not be loaded. Check your connection and try again.'}</p>
        <button type="button" onClick={() => setRetryAttempt(value => value + 1)} className="min-h-11 rounded-xl border border-cyan-300/40 bg-cyan-300/15 px-5 py-2 font-medium text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Retry</button>
      </div>}
    </div>
    <div data-chibi-controls className="border-t border-white/10 p-4">
      <div className="flex gap-2" aria-label="Student animations">{CHIBI_ACTIONS.map(id => {
        const interaction = model.profile.interactions[id]
        const reason = interaction.state !== 'available' ? interaction.reason || `${interaction.state} interaction` : missingClips.has(id) ? 'Published file is missing the assigned clip.' : null
        if (reason && !showDiagnostics) return null
        return <button key={id} type="button" disabled={!!reason || !!error} title={showDiagnostics ? reason || undefined : undefined} aria-pressed={active === id} onClick={() => playRef.current?.(id)} className={`min-h-11 flex-1 rounded-xl border whitespace-nowrap px-2 py-2 text-xs font-medium transition sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 ${active === id ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>{labels[id]}</button>
      })}</div>
      <p className="mt-2 text-center text-[10px] text-slate-400 sm:text-xs">{holding ? 'Release to put down' : <>Drag to rotate · <span className="hidden sm:inline">Right-drag or </span>two fingers to pan / zoom<span className="block mt-1">Hold the student to pick up and drag</span></>}</p>
    </div>
  </div>
}
