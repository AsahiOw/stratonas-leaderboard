'use client'

/* eslint-disable react-hooks/immutability -- Effects own the imperative Three.js scene and simulation. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Camera, Clock3, Pause, Play, Radio, RotateCcw, Rotate3D, Users, X, Hand, MapPin, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react'
import ProgressiveImage from '@/components/ui/ProgressiveImage'
import { imageSrc } from '@/lib/utils'
import type { ChibiCatalogStudent } from '@/lib/chibi/types'
import { initialPlaygroundMapping, type PlaygroundRole } from '@/lib/chibi/playground-mapping'
import { PlaygroundSimulation, PLAYGROUND_CAPACITY, playgroundStudentName, playgroundStudentKey, cameraWalkDirection, type PlaygroundActor, type Point } from '@/lib/chibi/playground-simulation'
import { OFFICE_SECTIONS, sectionAt } from '@/lib/chibi/playground-layout'
import { ChibiViewer } from './ChibiViewer'
import type { StudioActorController, StudioViewerHost } from './studio-types'
import { createPlaygroundEnvironment } from './playground-environment'
import { playgroundFade } from './playground-visibility'
import { createSocialEffects } from './playground-social'
import { createPlaygroundSky, playgroundTimeOfDay } from './playground-sky'
import { PlaygroundLoading } from './PlaygroundLoading'
import { PlaygroundRoster } from './PlaygroundRoster'
import { PlaygroundJoystick } from './PlaygroundJoystick'
import { PlaygroundRadio } from './PlaygroundRadio'
import { studentCameraView, STUDENT_EYE_HEIGHT, STUDENT_FOLLOW_HEIGHT } from './playground-camera'
import styles from './StudentPlayground.module.css'

type Runtime = Omit<StudioViewerHost, 'group' | 'ready' | 'failed'> & {
  actors: Map<number, { group: THREE.Group; controller: StudioActorController | null; fade: { value: number } | null; social: ReturnType<ReturnType<typeof createSocialEffects>['create']> }>
  effects: ReturnType<typeof createSocialEffects>
  sky: ReturnType<typeof createPlaygroundSky>
  simulation: PlaygroundSimulation; environment: ReturnType<typeof createPlaygroundEnvironment>; mapReady: boolean; initialised: boolean; started: boolean
  pendingArrival: { leavingId: number; student: ChibiCatalogStudent | null; sectionId: string } | null
}
type Snapshot = Pick<PlaygroundActor, 'id' | 'name' | 'position' | 'angle' | 'radius' | 'state' | 'label' | 'roam' | 'social' | 'speaking' | 'sectionId' | 'age' | 'ready' | 'leaving' | 'opacity' | 'pending' | 'arrivalTarget'> & { playback: ReturnType<StudioActorController['playback']> | null }
const mappingFor = (student: ChibiCatalogStudent) => initialPlaygroundMapping(student.model!.sourceIdentity, student.model!.profile)
function cameraFacing(runtime: Runtime, id: number) {
  const actor = runtime.simulation.actors.get(id)!
  return Math.atan2(runtime.camera.position.x - actor.position[0], runtime.camera.position.z - actor.position[1])
}
function queueVisitor(runtime: Runtime, leavingId: number, student: ChibiCatalogStudent | null) {
  const sectionId = runtime.simulation.actors.get(leavingId)?.sectionId
  if (!sectionId) return false
  if (runtime.pendingArrival || (student && runtime.simulation.hasStudent(student.name)) || !runtime.simulation.depart(leavingId)) return false
  runtime.pendingArrival = { leavingId, student, sectionId }; return true
}

function LocalClock({ sky }: { sky: Runtime['sky'] | undefined }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const update = () => { if (document.hidden) return; const date = new Date(); setNow(date); sky?.update(date) }
    update(); const timer = window.setInterval(update, 1000); document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }, [sky])
  const period = now ? playgroundTimeOfDay(now).period : ''
  return <div className={styles.clock} data-period={period} title={now ? `Local time · ${Intl.DateTimeFormat().resolvedOptions().timeZone}` : 'Local time'}>
    <Clock3 size={13} /><span>Local</span><time dateTime={now?.toISOString()}>{now ? now.toLocaleTimeString([], { hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}</time><span>· {period}</span>
  </div>
}

function PlaygroundStudent({ runtime, student, report }: { runtime: Runtime; student: ChibiCatalogStudent; report: (id: number, message: string) => void }) {
  const social = useMemo(() => runtime.effects.create(), [runtime.effects])
  const host = useMemo<StudioViewerHost>(() => {
    const group = new THREE.Group(); group.userData.playgroundActor = student.id; group.visible = false
    // Finish one-shot reactions even when culled or hidden in first person.
    return { ...runtime, group, playground: true, paused: () => !runtime.started || runtime.simulation.paused || (!group.visible && !runtime.simulation.actors.get(student.id)?.oneShot),
      animationInterval: () => runtime.simulation.controlledId === student.id ? 1 / 60 : group.position.distanceTo(runtime.camera.position) > 28 ? 1 / 15 : 1 / 30,
      ready: controller => {
        runtime.actors.set(student.id, { group, controller, fade: playgroundFade(group), social }); runtime.simulation.ready(student.id, controller.footprintRadius); report(student.id, 'Ready')
      }, failed: message => { runtime.simulation.fail(student.id, message); report(student.id, message) },
    }
  }, [runtime, student.id, report, social])
  useEffect(() => {
    runtime.scene.add(host.group, social.group); runtime.actors.set(student.id, { group: host.group, controller: null, fade: null, social })
    return () => { host.group.removeFromParent(); social.dispose(); runtime.actors.delete(student.id) }
  }, [runtime, host, student.id, social])
  return <ChibiViewer model={student.model!} studio={host} />
}

export function StudentPlayground({ students, loadError }: { students: ChibiCatalogStudent[]; loadError: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null), menuRef = useRef<HTMLDivElement>(null)
  const [runtime, setRuntime] = useState<Runtime | null>(null)
  const [invited, setInvited] = useState<number[]>([]), [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [selected, setSelected] = useState<number | null>(null), selectedRef = useRef<number | null>(null)
  const [search, setSearch] = useState(''), [choice, setChoice] = useState<number | null>(null), [limit, setLimit] = useState(12)
  const [visitors, setVisitors] = useState(false), visitorsRef = useRef(false)
  const [roster, setRoster] = useState(false), rosterRef = useRef(false), [swap, setSwap] = useState<number | null>(null)
  const [radio, setRadio] = useState(false), radioRef = useRef(false)
  const closeRadio = useCallback(() => setRadio(false), [])
  const [booting, setBooting] = useState(true)
  const [paused, setPaused] = useState(false), [cameraMode, setCameraMode] = useState(false), cameraModeRef = useRef(false)
  const [message, setMessage] = useState('Loading Schale Residence Hall…'), [fatalError, setFatalError] = useState(false)
  const [controlled, setControlled] = useState<number | null>(null), controlledRef = useRef<number | null>(null)
  const [firstPerson, setFirstPerson] = useState(false), firstPersonRef = useRef(false), followOffset = useRef(new THREE.Vector3(3.5, 7, 6))
  const keysRef = useRef(new Set<string>()), touchRef = useRef<Point>([0, 0])
  const moveJoystick = useCallback((direction: Point) => { touchRef.current = direction }, [])
  const controlActions = useRef({ exit: () => {}, interact: () => {} })
  const savedCamera = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const [retries, setRetries] = useState<Record<number, number>>({})
  const [fps, setFps] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const studentsRef = useRef(students)
  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { visitorsRef.current = visitors }, [visitors])
  useEffect(() => { rosterRef.current = roster }, [roster])
  useEffect(() => { radioRef.current = radio }, [radio])
  useEffect(() => { studentsRef.current = students }, [students])
  useEffect(() => { cameraModeRef.current = cameraMode; if (runtime && controlledRef.current === null) { runtime.controls.enableRotate = cameraMode; runtime.controls.mouseButtons.LEFT = cameraMode ? THREE.MOUSE.ROTATE : null; runtime.controls.touches.ONE = cameraMode ? THREE.TOUCH.ROTATE : null } }, [cameraMode, runtime])
  const report = useCallback((_id: number, status: string) => { if (status !== 'Ready') setMessage(status) }, [])
  const currentStudent = students.find(s => s.id === selected), current = snapshots.find(s => s.id === selected && s.ready && s.opacity > 0 && !s.leaving)
  const currentMapping = currentStudent ? mappingFor(currentStudent) : null
  const controlledActor = snapshots.find(actor => actor.id === controlled)
  const nearby = controlled !== null ? runtime?.simulation.nearbyStudent() : null
  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
  const choiceStudent = students.find(s => s.id === choice)
  const duplicate = choiceStudent && (snapshots.find(s => playgroundStudentKey(s.name) === playgroundStudentKey(choiceStudent.name)) ?? (runtime?.pendingArrival?.student && playgroundStudentKey(runtime.pendingArrival.student.name) === playgroundStudentKey(choiceStudent.name) ? runtime.pendingArrival.student : null))
  const has = (role: PlaygroundRole) => !current?.arrivalTarget && !!currentMapping?.roles[role].length

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false }) }
    catch { setFatalError(true); setMessage('WebGL is unavailable. Enable hardware acceleration and reload to open the playground.'); return }
    const mobile = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1 : 1.25)); renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-label', 'Schale Residence Hall. Drag the map to pan, scroll or pinch to zoom, click students for actions.'); renderer.domElement.tabIndex = 0; renderer.domElement.style.cursor = 'grab'
    container.appendChild(renderer.domElement)
    const scene = new THREE.Scene(), ambient = new THREE.HemisphereLight('#f5faff', '#8aa2bb', 1.8); scene.add(ambient)
    const light = new THREE.DirectionalLight('#fff8ed', 1.8); light.position.set(-3, 8, 6); scene.add(light)
    const sky = createPlaygroundSky(scene, ambient, light)
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 450), controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.3, 0); controls.enableDamping = true; controls.enableRotate = false; controls.mouseButtons.LEFT = null; controls.touches.ONE = null; controls.touches.TWO = THREE.TOUCH.DOLLY_PAN
    controls.screenSpacePanning = false; controls.minDistance = 6; controls.maxDistance = 300; controls.maxPolarAngle = Math.PI / 2.5; controls.minPolarAngle = 0.15
    const actors: Runtime['actors'] = new Map(), environment = createPlaygroundEnvironment(scene), effects = createSocialEffects()
    const simulation = new PlaygroundSimulation(
      (id, clip, loop, movement) => actors.get(id)?.controller?.play(clip, { loop, movement }) ?? Promise.resolve(false),
      (id, clip) => actors.get(id)?.controller?.clips.find(c => c.name === clip)?.duration ?? 1,
      Math.random, id => actors.get(id)?.controller?.pause(true),
      (id, clip) => { const playback = actors.get(id)?.controller?.playback(); return !!playback && playback.clip === clip && playback.time >= playback.duration },
    )
    const animationUpdates = new Set<(time: number) => void>()
    const state: Runtime = { scene, renderer, camera, controls, actors, simulation, environment, effects, sky, registerFrame: update => { animationUpdates.add(update); return () => { animationUpdates.delete(update) } }, mapReady: false, initialised: false, started: false, pendingArrival: null }; setRuntime(state)
    let active = true
    environment.ready.then(() => { if (active) { state.mapReady = true; setMessage('Schale Residence Hall is ready. Tap a student to play, or drag them to a new spot.') } }).catch(() => { if (active) { setFatalError(true); setMessage('The residence hall could not load. Reload to try again.') } })
    const home = () => { const scale = Math.max(1, 1.2 / camera.aspect); camera.position.set(10 * scale, 54 * scale, 55 * scale); controls.target.set(0, 0.3, 0); controls.update() }
    const resize = () => { camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1); camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); sky.resize(container.clientWidth, container.clientHeight); if (controlledRef.current === null) home() }
    const observer = new ResizeObserver(resize); observer.observe(container); resize()
    const raycaster = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), point = new THREE.Vector3()
    const aim = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera)
    }
    const hitObject = () => {
      const objects = [...actors.values()].map(a => a.group)
      for (const hit of raycaster.intersectObjects(objects, true)) {
        let visible = true, parent: THREE.Object3D | null = hit.object
        while (parent) { if (!parent.visible) visible = false; parent = parent.parent }
        if (!visible) continue
        let object: THREE.Object3D | null = hit.object
        while (object) {
          if (typeof object.userData.playgroundActor === 'number' && !simulation.actors.get(object.userData.playgroundActor)?.leaving) return { actor: object.userData.playgroundActor as number }
          object = object.parent
        }
      }
      return null
    }
    let pointer: { x: number; y: number; lastX: number; lastY: number; actor?: number; dragged: boolean; offset: Point } | null = null
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) { cancelPointer(); return }
      if (!state.started || !event.isPrimary || event.button !== 0 || cameraModeRef.current || controlledRef.current !== null) return
      aim(event); const hit = hitObject(); raycaster.ray.intersectPlane(floor, point)
      const actor = hit?.actor === undefined ? null : simulation.actors.get(hit.actor)
      pointer = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, ...hit, dragged: false, offset: actor ? [actor.position[0] - point.x, actor.position[1] - point.z] : [0, 0] }
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const movePointer = (event: PointerEvent) => {
      if (!pointer) return
      if (pointer.actor === undefined) {
        if (!pointer.dragged && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) { pointer.dragged = true; renderer.domElement.style.cursor = 'grabbing' }
        if (pointer.dragged) { controls.pan(event.clientX - pointer.lastX, event.clientY - pointer.lastY); controls.update() }
        pointer.lastX = event.clientX; pointer.lastY = event.clientY; return
      }
      if (simulation.paused) return
      if (!pointer.dragged && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) {
        if (!simulation.beginDrag(pointer.actor, cameraFacing(state, pointer.actor))) return
        pointer.dragged = true; selectedRef.current = pointer.actor; setSelected(pointer.actor); setMessage('Drop them on a clear spot.'); renderer.domElement.style.cursor = 'grabbing'
      }
      if (!pointer.dragged) return
      aim(event)
      if (raycaster.ray.intersectPlane(floor, point)) simulation.drag(pointer.actor, [point.x + pointer.offset[0], point.z + pointer.offset[1]])
    }
    const up = (event: PointerEvent) => {
      const previous = pointer; pointer = null; renderer.domElement.style.cursor = 'grab'
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
      if (!previous) return
      if (previous.dragged && previous.actor !== undefined) { simulation.endDrag(previous.actor); setMessage('A new spot to hang out.'); return }
      if (previous.dragged) return
      if (Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 8) return
      if (previous.actor !== undefined) { selectedRef.current = previous.actor; setSelected(previous.actor); return }
      aim(event)
      if (!raycaster.ray.intersectPlane(floor, point)) return
      const target: Point = [point.x, point.z]
      if (selectedRef.current !== null && !simulation.paused && simulation.move(selectedRef.current, target)) {
        environment.marker.position.set(point.x, 0.055, point.z); environment.marker.visible = true; setMessage('On the way!')
      } else { setSelected(null); selectedRef.current = null }
    }
    const cancelPointer = () => { if (pointer?.dragged && pointer.actor !== undefined) simulation.endDrag(pointer.actor); pointer = null; renderer.domElement.style.cursor = 'grab' }
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', movePointer); renderer.domElement.addEventListener('pointerup', up); renderer.domElement.addEventListener('pointercancel', cancelPointer)
    const key = (event: KeyboardEvent, down: boolean) => {
      if (radioRef.current || controlledRef.current === null || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
      const value = event.key.toLowerCase()
      if (!['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'e', 'escape'].includes(value)) return
      event.preventDefault()
      if (down) keysRef.current.add(value); else keysRef.current.delete(value)
      if (down && !event.repeat && value === 'escape') controlActions.current.exit()
      if (down && !event.repeat && value === 'e') controlActions.current.interact()
    }
    const keyDown = (event: KeyboardEvent) => key(event, true), keyUp = (event: KeyboardEvent) => key(event, false)
    const clearInput = () => { keysRef.current.clear(); touchRef.current = [0, 0] }
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', clearInput); document.addEventListener('visibilitychange', clearInput)
    let frame = 0, previous = 0, elapsed = 0, lastSnapshot = 0, sampleTime = 0, frames = 0, slowSamples = 0, fastSamples = 0, lastDraw = 0, visitorIn = 5
    let targetFps = mobile ? 30 : 60, nextFrameTime = 0, frameWork = 0, promotionAfter = 0, lastSnapshotKey = '', lastNearbyId: number | undefined
    const projected = new THREE.Vector3(), frustum = new THREE.Frustum(), viewProjection = new THREE.Matrix4(), actorBounds = new THREE.Sphere(new THREE.Vector3(), 1.8)
    const render = (time: number) => {
      if (!document.hidden && time < nextFrameTime - 0.5) { frame = requestAnimationFrame(render); return }
      const interval = 1000 / targetFps
      nextFrameTime = nextFrameTime ? time + interval - (time - nextFrameTime) % interval : time + interval
      const workStarted = performance.now()
      const delta = previous ? Math.min((time - previous) / 1000, 0.05) : 0; previous = time
      if (!document.hidden) {
        if (state.started) { simulation.tick(delta); if (!simulation.paused) { elapsed += delta; visitorIn = visitorsRef.current || rosterRef.current ? 5 : visitorIn - delta } }; scene.userData.chibiElapsedSeconds = elapsed
        const controlledActor = simulation.actors.get(controlledRef.current ?? -1)
        if (controlledRef.current !== null) {
          if (!controlledActor?.ready || controlledActor.leaving || simulation.controlledId !== controlledRef.current) controlActions.current.exit()
          else {
            const keys = keysRef.current, pressed = (first: string, second: string) => Number(keys.has(first) || keys.has(second))
            const input: Point = [pressed('d', 'arrowright') - pressed('a', 'arrowleft') + touchRef.current[0], pressed('w', 'arrowup') - pressed('s', 'arrowdown') + touchRef.current[1]]
            simulation.steer(cameraWalkDirection(input, [camera.position.x - controls.target.x, camera.position.z - controls.target.z]), delta)
            projected.set(controlledActor.position[0], firstPersonRef.current ? STUDENT_EYE_HEIGHT : STUDENT_FOLLOW_HEIGHT, controlledActor.position[1]).sub(controls.target)
            camera.position.add(projected); controls.target.add(projected)
          }
        }
        if (state.pendingArrival && !simulation.actors.has(state.pendingArrival.leavingId)) {
          const next = state.pendingArrival.student
          const arrived = !next || simulation.invite(next.id, next.name, mappingFor(next), state.pendingArrival.sectionId) || simulation.invite(next.id, next.name, mappingFor(next))
          if (arrived) {
            if (next) { const room = simulation.actors.get(next.id)!.sectionId; simulation.sectionTargets.set(room, Math.max(simulation.sectionTargets.get(room) ?? 1, simulation.sectionPopulation(room))) }
            state.pendingArrival = null; setTransitioning(false); setInvited([...simulation.actors.keys()])
            setMessage(next ? `${playgroundStudentName(next.name)} is arriving…` : 'There’s room for a new visitor. Use Visitors to invite someone.')
            visitorIn = 5
          }
        }
        if (state.started && visitorIn <= 0 && !simulation.paused && !state.pendingArrival && ![...simulation.actors.values()].some(actor => actor.leaving) && !visitorsRef.current && !rosterRef.current && controlledRef.current === null) {
          visitorIn = 5
          const protectedIds = selectedRef.current === null ? [] : [selectedRef.current]
          const surplus = simulation.surplusVisitor(protectedIds), vacancy = simulation.vacantSection()
          const pool = studentsRef.current.filter(s => !simulation.hasStudent(s.name) && mappingFor(s).roles.walk.length)
          const replace = surplus ?? (vacancy ? null : simulation.replacement(protectedIds))
          if (surplus !== null) {
            if (queueVisitor(state, surplus, null)) { setTransitioning(true); setMessage('A visitor is heading home. The rooms change company over time.') }
          } else if (vacancy && pool.length) {
            const next = pool[Math.floor(Math.random() * pool.length)]
            if (simulation.invite(next.id, next.name, mappingFor(next), vacancy)) { setInvited([...simulation.actors.keys()]); setMessage(`${playgroundStudentName(next.name)} is arriving…`) }
          } else if (replace !== null && pool.length) {
            const next = pool[Math.floor(Math.random() * pool.length)], leaving = simulation.actors.get(replace)!
            if (queueVisitor(state, replace, next)) { setTransitioning(true); setMessage(`${playgroundStudentName(leaving.name)} is heading to the exit.`) }
          }
        }
        controls.update(delta); camera.updateMatrixWorld(); frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
        const mapReady = state.mapReady
        for (const [id, actor] of actors) {
          const state = simulation.actors.get(id)
          actorBounds.center.set(state?.position[0] ?? 0, 1, state?.position[1] ?? 0)
          actor.group.visible = mapReady && !!state?.ready && state.opacity > 0 && !(firstPersonRef.current && id === controlledRef.current) && frustum.intersectsSphere(actorBounds)
          if (actor.fade) actor.fade.value = state?.opacity ?? 0
          if (state) {
            actor.group.position.set(state.position[0], state.state === 'dragging' ? 0.4 : 0.04, state.position[1]); actor.group.rotation.y = state.angle
            actor.social.group.quaternion.copy(camera.quaternion); actor.social.update(state, elapsed, actor.group.visible)
            projected.set(state.position[0], 2.25, state.position[1]).project(camera)
            const x = (projected.x + 1) / 2 * container.clientWidth, y = (1 - projected.y) / 2 * container.clientHeight
            if (id === selectedRef.current && menuRef.current) { menuRef.current.style.left = `${Math.max(12, Math.min(container.clientWidth - 252, x + 55))}px`; menuRef.current.style.top = `${Math.max(85, Math.min(container.clientHeight - menuRef.current.offsetHeight - 95, y))}px` }
          } else actor.social.group.visible = false
        }
        const selection = simulation.actors.get(selectedRef.current ?? -1)
        environment.selection.visible = !!selection?.ready && !selection.leaving && !firstPersonRef.current; if (selection) environment.selection.position.set(selection.position[0], 0.055, selection.position[1])
        if (selection?.state !== 'walking') environment.marker.visible = false
        animationUpdates.forEach(update => update(time))
        if (!simulation.paused || controls.enabled || time - lastDraw > 250) { renderer.render(scene, camera); frames++; lastDraw = time }
        if (!state.started && state.initialised && state.mapReady && [...simulation.actors.values()].every(actor => actor.ready && !actor.pending)) { state.started = true; setBooting(false) }
        const interactiveUi = selectedRef.current !== null || controlledRef.current !== null || rosterRef.current
        if (time - lastSnapshot > (interactiveUi || !state.started ? 250 : 1000)) {
          lastSnapshot = time
          const snapshotKey = `${selectedRef.current}:${controlledRef.current}:${rosterRef.current}|` + [...simulation.actors.values()].map(actor => [actor.id, actor.state, actor.ready, actor.leaving, actor.pending, actor.opacity > 0, actor.roam, actor.social, actor.label, sectionAt(actor.position)?.id, !!actor.arrivalTarget].join(':')).join('|')
          const nearbyId = controlledRef.current !== null ? simulation.nearbyStudent()?.id : undefined
          if (snapshotKey !== lastSnapshotKey || nearbyId !== lastNearbyId) {
            lastSnapshotKey = snapshotKey; lastNearbyId = nearbyId
            setSnapshots([...simulation.actors.values()].map(({ id, name, position, angle, radius, state, label, roam, social, speaking, sectionId, age, ready, leaving, opacity, pending, arrivalTarget }) => ({ id, name, position: [...position] as Point, angle, radius, state, label, roam, social, speaking, sectionId, age, ready, leaving, opacity, pending, arrivalTarget, playback: actors.get(id)?.controller?.playback() ?? null })))
          }
          const ids = [...simulation.actors.keys()]; setInvited(previous => previous.length === ids.length && previous.every((id, i) => id === ids[i]) ? previous : ids)
        }
        if (time - sampleTime > 3000) {
          const measured = frames * 1000 / (time - sampleTime); setFps(Math.round(measured))
          if (state.started && !simulation.paused && measured < targetFps * 0.85) slowSamples++; else slowSamples = 0
          if (state.started && !simulation.paused && measured >= targetFps * 0.95 && frameWork / Math.max(frames, 1) < 10) fastSamples++; else fastSamples = 0
          if (mobile && slowSamples >= 2 && targetFps === 60) { targetFps = 30; promotionAfter = time + 30000; slowSamples = 0; fastSamples = 0 }
          else if (mobile && fastSamples >= 3 && targetFps === 30 && time >= promotionAfter) { targetFps = 60; fastSamples = 0 }
          if (slowSamples >= 2 && renderer.getPixelRatio() > 0.75) { renderer.setPixelRatio(Math.max(0.75, renderer.getPixelRatio() - 0.25)); renderer.setSize(container.clientWidth, container.clientHeight); slowSamples = 0 }
          if (fastSamples >= 3 && renderer.getPixelRatio() < Math.min(window.devicePixelRatio, 1.25)) { renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25, renderer.getPixelRatio() + 0.25)); renderer.setSize(container.clientWidth, container.clientHeight); fastSamples = 0 }
          sampleTime = time; frames = 0; frameWork = 0
        }
        frameWork += performance.now() - workStarted
      } else { sampleTime = time; frames = 0; frameWork = 0; previous = 0; nextFrameTime = 0 }
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', movePointer); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('pointercancel', cancelPointer)
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', clearInput); document.removeEventListener('visibilitychange', clearInput)
      active = false; controls.dispose(); environment.dispose(); effects.dispose(); sky.dispose(); renderer.dispose(); renderer.domElement.remove()
    }
  }, [])

  useEffect(() => {
    if (!runtime || runtime.initialised) return
    const pool = students.filter(s => mappingFor(s).roles.walk.length)
    for (const section of OFFICE_SECTIONS) while (runtime.simulation.sectionPopulation(section.id) < (runtime.simulation.sectionTargets.get(section.id) ?? 1) && pool.length) {
      const student = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
      runtime.simulation.add(student.id, student.name, mappingFor(student), section.id)
    }
    setInvited([...runtime.simulation.actors.keys()])
    runtime.initialised = true
  }, [runtime, students])

  const invite = () => {
    if (!runtime || !choiceStudent?.model || duplicate) return
    const replace = runtime.simulation.actors.size >= PLAYGROUND_CAPACITY ? swap : null
    if (runtime.simulation.actors.size >= PLAYGROUND_CAPACITY && (replace === null || runtime.pendingArrival)) return
    if (replace !== null) {
      if (!queueVisitor(runtime, replace, choiceStudent)) { setMessage('This student needs an imported Walk animation to head home.'); return }
      setTransitioning(true); setSelected(null); setMessage(`${playgroundStudentName(runtime.simulation.actors.get(replace)?.name ?? 'Your visitor')} is heading to the exit.`)
    } else {
      if (!runtime.simulation.invite(choiceStudent.id, choiceStudent.name, mappingFor(choiceStudent))) { setMessage('This student needs a Walk animation and a clear arrival spot.'); return }
      const room = runtime.simulation.actors.get(choiceStudent.id)!.sectionId
      runtime.simulation.sectionTargets.set(room, Math.max(runtime.simulation.sectionTargets.get(room) ?? 1, runtime.simulation.sectionPopulation(room)))
      setInvited([...runtime.simulation.actors.keys()]); setSelected(choiceStudent.id); setMessage(`${playgroundStudentName(choiceStudent.name)} is arriving…`)
    }
    setVisitors(false)
  }
  const togglePause = (value: boolean) => { if (!runtime) return; runtime.simulation.paused = value; keysRef.current.clear(); touchRef.current = [0, 0]; setPaused(value) }
  const exitControl = () => {
    if (!runtime || controlledRef.current === null) return
    runtime.simulation.releaseControl(); controlledRef.current = null; setControlled(null); keysRef.current.clear(); touchRef.current = [0, 0]
    firstPersonRef.current = false; setFirstPerson(false)
    const controls = runtime.controls
    controls.enableDamping = false; controls.update(); controls.enableDamping = true
    runtime.camera.fov = 38; runtime.camera.updateProjectionMatrix(); controls.enableZoom = true; controls.maxPolarAngle = Math.PI / 2.5
    controls.minDistance = 6; controls.maxDistance = 300; controls.enablePan = true; controls.enableRotate = false; controls.mouseButtons.LEFT = null; controls.mouseButtons.RIGHT = THREE.MOUSE.PAN; controls.touches.ONE = null; controls.touches.TWO = THREE.TOUCH.DOLLY_PAN
    if (savedCamera.current) { runtime.camera.position.copy(savedCamera.current.position); controls.target.copy(savedCamera.current.target); savedCamera.current = null }
    controls.update(); setMessage('Back to the hall. Your student is taking over again.')
  }
  const startControl = () => {
    if (!runtime || selected === null || !runtime.simulation.control(selected)) return
    const actor = runtime.simulation.actors.get(selected)!, controls = runtime.controls
    savedCamera.current = { position: runtime.camera.position.clone(), target: controls.target.clone() }
    controlledRef.current = selected; setControlled(selected); cameraModeRef.current = false; setCameraMode(false); keysRef.current.clear(); touchRef.current = [0, 0]
    firstPersonRef.current = false; setFirstPerson(false); followOffset.current.set(3.5, 7, 6)
    controls.minDistance = 4; controls.maxDistance = 18; controls.enablePan = false; controls.enableRotate = true; controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; controls.mouseButtons.RIGHT = null; controls.touches.ONE = THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE
    studentCameraView(runtime.camera, controls, actor.position, actor.angle, false, followOffset.current)
    runtime.renderer.domElement.focus({ preventScroll: true }); setMessage(`You’re controlling ${playgroundStudentName(actor.name)}. Walk up to a friend and interact.`)
  }
  const changeStudentView = (value: boolean) => {
    const actor = runtime?.simulation.actors.get(controlledRef.current ?? -1)
    if (!runtime || !actor || value === firstPersonRef.current) return
    if (value) followOffset.current.copy(runtime.camera.position).sub(runtime.controls.target)
    firstPersonRef.current = value; setFirstPerson(value); keysRef.current.clear(); touchRef.current = [0, 0]
    studentCameraView(runtime.camera, runtime.controls, actor.position, actor.angle, value, followOffset.current)
    runtime.renderer.domElement.focus({ preventScroll: true })
  }
  const interact = () => {
    const other = runtime?.simulation.nearbyStudent()
    if (!runtime || !other || !runtime.simulation.interact()) return
    keysRef.current.clear(); touchRef.current = [0, 0]; setMessage(`Meeting ${playgroundStudentName(other.name)}. Walk to end the conversation.`)
  }
  useEffect(() => { controlActions.current = { exit: exitControl, interact } })
  const photo = () => {
    if (!runtime || snapshots.some(a => a.state === 'loading') || [...runtime.actors.values()].some(a => a.controller?.playback().loadingClip)) { setMessage('Students are loading. Try your photo in a moment.'); return }
    runtime.renderer.render(runtime.scene, runtime.camera)
    runtime.renderer.domElement.toBlob(blob => {
      if (!blob) { setMessage('The photo could not be created. Try again.'); return }
      const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'stratonas-playground.png'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Your office photo was downloaded.')
    }, 'image/png')
  }
  const retry = (id: number) => {
    const actor = runtime?.simulation.actors.get(id)
    if (!actor) return
    runtime!.simulation.cancel(id); actor.ready = false; actor.state = 'loading'; actor.label = 'Arriving…'
    setRetries(previous => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }))
  }
  const remove = (id: number) => {
    const room = runtime?.simulation.actors.get(id)?.sectionId
    if (!runtime || !room || !runtime.simulation.depart(id)) { setMessage('This student needs an imported Walk animation to head home.'); return }
    runtime.simulation.sectionTargets.set(room, Math.max(1, runtime.simulation.sectionPopulation(room) - 1))
    setInvited([...runtime.simulation.actors.keys()]); if (selected === id) setSelected(null); setMessage('Your visitor is heading to the exit.')
  }
  const replacementName = students.find(s => s.id === swap)?.name
  const loading = invited.filter(id => !snapshots.find(actor => actor.id === id && (actor.ready || actor.state === 'error'))).slice(0, 2)
  const focusRoom = (id: string) => {
    if (!runtime) return
    const section = OFFICE_SECTIONS.find(section => section.id === id)!
    const scale = Math.max(1, 0.75 / runtime.camera.aspect)
    runtime.controls.target.set(section.center[0], 0.3, section.center[1]); runtime.camera.position.set(section.center[0] + 8 * scale, 12 * scale, section.center[1] + 13 * scale); runtime.controls.update(); setSelected(null)
  }
  const focusStudent = (id: number) => {
    const actor = runtime?.simulation.actors.get(id)
    if (!runtime || !actor) return
    const scale = Math.max(1, 0.75 / runtime.camera.aspect)
    runtime.controls.target.set(actor.position[0], 0.3, actor.position[1]); runtime.camera.position.set(actor.position[0] + 8 * scale, 12 * scale, actor.position[1] + 13 * scale); runtime.controls.update()
    setRoster(false); setCameraMode(false); setSelected(id)
  }
  return <div className={styles.playground}>
    <div ref={containerRef} className={styles.stage} data-playground-stage data-camera-view={controlled === null ? 'overview' : firstPerson ? 'first-person' : 'third-person'} />
    <header className={styles.hud}>
      <div className={styles.title}><a href="/other" aria-label="Back to Other Features">←</a><div><h1>Schale Residence Hall</h1><span>{snapshots.filter(actor => actor.ready).length}/{PLAYGROUND_CAPACITY} visitors</span><LocalClock sky={runtime?.sky} /></div></div>
      <div className={styles.toolbar}>
        <button aria-label="Current residents" disabled={controlled !== null} onClick={() => setRoster(true)}><MapPin size={18} /><span>Residents</span></button>
        <button aria-label="Visitors" disabled={controlled !== null} onClick={() => { setSwap(selected); setVisitors(true) }}><Users size={18} /><span>Invite</span></button>
        <button aria-label={paused ? 'Resume playground' : 'Pause playground'} onClick={() => togglePause(!paused)} disabled={fatalError}>{paused ? <Play size={18} /> : <Pause size={18} />}<span>{paused ? 'Play' : 'Pause'}</span></button>
        <button className={styles.cameraToggle} aria-label="Rotate view" title="Rotate view: drag to orbit, right-drag or two fingers to pan" aria-pressed={cameraMode} disabled={controlled !== null} onClick={() => { setCameraMode(value => !value); setSelected(null) }}><Rotate3D size={18} /><span>Rotate</span></button>
        <button aria-label="Reset camera" title="Reset camera" onClick={() => { if (!runtime) return; exitControl(); const scale = Math.max(1, 1.2 / runtime.camera.aspect); runtime.camera.position.set(10 * scale, 54 * scale, 55 * scale); runtime.controls.target.set(0, 0.3, 0); runtime.controls.update() }}><RotateCcw size={18} /><span>Reset</span></button>
        <button aria-label="Take photo" onClick={photo} disabled={fatalError}><Camera size={18} /><span>Photo</span></button>
        <button aria-label="Choose background music" title="Choose background music" aria-haspopup="dialog" aria-expanded={radio} aria-controls="playground-radio-dialog" onClick={() => { keysRef.current.clear(); touchRef.current = [0, 0]; setRadio(true) }}><Radio size={18} /><span>Radio</span></button>
      </div>
    </header>
    <div hidden>{snapshots.map(actor => <div key={actor.id} data-resident={actor.id} data-controlled={actor.id === controlled} data-student={actor.name} data-ready={actor.ready} data-leaving={actor.leaving} data-arriving={!!actor.arrivalTarget} data-opacity={actor.opacity.toFixed(2)} data-state={actor.state} data-social={actor.social ?? ''} data-speaking={actor.speaking} data-section={actor.sectionId} data-position={actor.position.join(',')} data-angle={actor.angle} data-radius={actor.radius} data-age={Math.floor(actor.age)} data-clip={actor.playback?.clip ?? ''} data-clip-time={actor.playback?.time.toFixed(3)} data-clip-duration={actor.playback?.duration.toFixed(3)} />)}</div>
    {current && controlled === null && !cameraMode && <div ref={menuRef} className={styles.studentMenu} role="group" aria-label={`Actions for ${current.name}`}>
      <div className={styles.sectionHeading}><h2>{current.name}</h2><button aria-label="Close student actions" onClick={() => setSelected(null)}><X size={16} /></button></div>
      <p className={styles.hint}>Drag to carry · tap the floor to walk</p>
      <div className={styles.segment}><button disabled={!!current.arrivalTarget} aria-pressed={current.roam} onClick={() => runtime?.simulation.roam(current.id, true)}>Explore</button><button disabled={!!current.arrivalTarget} aria-pressed={!current.roam} onClick={() => runtime?.simulation.roam(current.id, false)}>Stay here</button></div>
      <div className={styles.segment}><button disabled={paused || !has('reaction') || current.state === 'loading'} onClick={() => runtime?.simulation.react(current.id)}><Hand size={15} /> Say hello</button><button disabled={paused || !has('pickup') || current.state === 'loading'} onClick={() => runtime?.simulation.react(current.id, 'pickup', cameraFacing(runtime, current.id))}>Pick up</button></div>
      <label>Meet a friend<select aria-label="Chat partner" value="" disabled={paused || !has('walk')} onChange={e => {
        setMessage(runtime?.simulation.greet(current.id, Number(e.target.value)) ? 'They’re meeting up!' : 'They need a clear meeting spot and Walk animations.')
      }}><option value="">Choose a friend…</option>{snapshots.filter(a => a.id !== current.id && a.ready && !a.leaving && !a.arrivalTarget).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      {current.state === 'error' && <button onClick={() => retry(current.id)}>Retry loading</button>}
      <div className={styles.segment}><button aria-label={`Control ${current.name}`} onClick={startControl} disabled={paused || current.pending || !has('walk') || !runtime?.actors.get(current.id)?.controller}><Camera size={15} /> Student camera</button><button disabled={paused || !currentMapping?.roles.walk.length} onClick={() => remove(current.id)}>Send home</button></div>
    </div>}
    {controlled !== null && controlledActor && <section className={styles.studentControls} aria-label="Student camera controls">
      <div className={styles.controlHeading}><Camera size={18} /><div><strong title={controlledActor.name}>{controlledActor.name}</strong><span>{paused ? 'Paused' : controlledActor.label}</span></div><button onClick={exitControl} aria-label="Exit student camera"><X size={17} /> Exit</button></div>
      <div className={styles.controlBody}><PlaygroundJoystick key={`${controlled}:${firstPerson}:${paused}`} disabled={paused} onMove={moveJoystick} /><div className={styles.directionPad} role="group" aria-label="Walk controls">{[
        { name: 'forward', direction: [0, 1], icon: ArrowUp }, { name: 'left', direction: [-1, 0], icon: ArrowLeft }, { name: 'backward', direction: [0, -1], icon: ArrowDown }, { name: 'right', direction: [1, 0], icon: ArrowRight },
      ].map(({ name, direction, icon: Icon }) => <button key={name} aria-label={`Walk ${name}`} disabled={paused} onPointerDown={event => { touchRef.current = direction as Point; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerUp={() => { touchRef.current = [0, 0] }} onPointerCancel={() => { touchRef.current = [0, 0] }} onLostPointerCapture={() => { touchRef.current = [0, 0] }}><Icon size={21} /></button>)}</div>
        <div className={styles.controlInteraction}><div className={styles.viewChoices} role="group" aria-label="Student camera perspective"><button aria-pressed={!firstPerson} onClick={() => changeStudentView(false)}>Third person</button><button aria-pressed={firstPerson} onClick={() => changeStudentView(true)}>First person</button></div><button disabled={paused || !nearby || controlledActor.pending} onClick={interact}><MessageCircle size={17} /><span>{nearby ? `Talk to ${playgroundStudentName(nearby.name)}` : controlledActor.social ? 'Chatting…' : 'Walk near a friend'}</span><kbd>E</kbd></button></div></div>
      <p className={styles.controlHint}><span>WASD / arrows to walk · E to talk · Esc to exit</span><span>Drag joystick to walk · swipe the scene to look</span></p>
    </section>}
    <footer className={`${styles.gameFooter} ${controlled !== null ? styles.controlFooter : ''} ${current && !cameraMode ? styles.studentMenuFooter : ''}`}>
      <div className={styles.mapHint}><span>{cameraMode ? 'Drag to rotate · right-drag to pan · scroll to zoom' : 'Drag map to pan · scroll to zoom · drag students to carry'}</span><span>{cameraMode ? 'Drag to rotate · pinch to zoom · two fingers to pan' : 'Drag to pan · pinch to zoom · drag students to carry'}</span></div>
      <span className={styles.frameRate}>{paused ? 'Paused' : fps ? `${fps} FPS` : 'Starting…'}</span>
      <small className={styles.credits}>3D model: <a href="https://x.com/Mi_kuNeko_" target="_blank" rel="noopener noreferrer">@Mi_kuNeko_</a><br />Recreated using Codex</small>
    </footer>
    {fatalError && <p className={styles.notice}>{message}</p>}
    {!booting && !invited.length && !fatalError && <div className={styles.notice}><Users size={24} /><h2>Your residence hall</h2><p>{loadError || (students.length ? 'Invite someone to play.' : 'No published models are available yet.')}</p><button onClick={() => setVisitors(true)}>Invite students</button></div>}
    {visitors && <div className={styles.scrim} onClick={() => setVisitors(false)}><section role="dialog" aria-modal="true" aria-label="Invite students" className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.sectionHeading}><div><h2>Who’s visiting?</h2><p className={styles.hint}>{Math.max(0, PLAYGROUND_CAPACITY - invited.length)} open slots · New visitors walk in through the entrance.</p></div><button aria-label="Close visitors" onClick={() => setVisitors(false)}><X size={20} /></button></div>
      <label>Find a student<input placeholder="Search by name…" value={search} onChange={e => { setSearch(e.target.value); setLimit(12) }} /></label>
      <div className={styles.choices} role="group" aria-label="Choose a student" onScroll={event => {
        const list = event.currentTarget
        if (list.scrollHeight - list.scrollTop - list.clientHeight < 80) setLimit(value => Math.min(value + 12, filtered.length))
      }}>{filtered.slice(0, limit).map(student => <button key={student.id} data-choice={student.id} data-in-residence={invited.includes(student.id)} aria-pressed={choice === student.id} onClick={() => setChoice(student.id)}><span className={styles.portrait}><ProgressiveImage src={imageSrc(student.image)} alt="" fill sizes="110px" style={{ objectFit: 'cover' }} /></span><span>{student.name}</span>{invited.includes(student.id) && <small>In residence</small>}</button>)}</div>
      {!filtered.length && <p className={styles.hint}>No students match this search.</p>}
      {invited.length >= PLAYGROUND_CAPACITY && <label>Make room for your visitor<select aria-label="Student to send home" value={swap ?? ''} onChange={event => setSwap(event.target.value ? Number(event.target.value) : null)}><option value="">Choose who leaves…</option>{snapshots.filter(actor => !actor.leaving).map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>}
      <button className={styles.primary} disabled={!choiceStudent || !runtime || fatalError || !!duplicate || (invited.length >= PLAYGROUND_CAPACITY && (transitioning || swap === null)) || paused || !(mappingFor(choiceStudent)).roles.walk.length} onClick={invite}>{duplicate ? `${playgroundStudentName(duplicate.name)} is already visiting` : invited.length >= PLAYGROUND_CAPACITY && transitioning ? 'Waiting for the exit…' : choiceStudent ? invited.length >= PLAYGROUND_CAPACITY ? replacementName ? `Swap ${replacementName} for ${choiceStudent.name}` : 'Choose who leaves first' : `Invite ${choiceStudent.name}` : 'Choose a student to invite'}</button>
    </section></div>}
    {roster && <PlaygroundRoster students={students} residents={snapshots} paused={paused} onClose={() => setRoster(false)} onFocusRoom={id => { focusRoom(id); setRoster(false) }} onSelect={focusStudent} onRemove={remove} onRetry={retry} />}
    {radio && <PlaygroundRadio onClose={closeRadio} />}
    {runtime && invited.filter(id => loading.includes(id) || snapshots.some(actor => actor.id === id && (actor.ready || actor.state === 'error'))).map(id => <PlaygroundStudent key={`${id}:${retries[id] ?? 0}`} runtime={runtime} student={students.find(student => student.id === id)!} report={report} />)}
    {booting && <PlaygroundLoading loaded={snapshots.filter(actor => actor.ready && !actor.pending).length} total={invited.length} mapReady={runtime?.mapReady}>
      {fatalError && <div role="alert"><p>{message}</p><button onClick={() => window.location.reload()}>Retry opening the hall</button></div>}
      {snapshots.filter(actor => actor.state === 'error').map(actor => <div className={styles.loadingFailure} key={actor.id} role="alert"><span>{actor.name} could not load.</span><button onClick={() => retry(actor.id)}>Retry</button><button onClick={() => remove(actor.id)}>Skip student</button></div>)}
    </PlaygroundLoading>}
  </div>
}

