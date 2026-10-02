'use client'

/* eslint-disable react-hooks/immutability -- Three.js scene objects are imperative resources, managed and disposed by effects. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Download, Move, Trash2, Users, Image as ImageIcon, SlidersHorizontal } from 'lucide-react'
import ProgressiveImage from '@/components/ui/ProgressiveImage'
import { imageSrc } from '@/lib/utils'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ChibiCatalogStudent } from '@/lib/chibi/types'
import type { StudioBackground } from '@/lib/chibi/studio-backgrounds'
import { DEFAULT_STUDIO_CAMERA, STUDIO_STORAGE_KEY, parseStudioScene, studioLayers, type StudioActor, type StudioScene, type StudioLayer } from '@/lib/chibi/studio-scene'
import { ChibiViewer } from './ChibiViewer'
import type { StudioActorController, StudioPlayback, StudioViewerHost } from './studio-types'
import { renderStudio } from './studio-render'
import styles from './PhotoStudio.module.css'

type Stage = Omit<StudioViewerHost, 'group' | 'ready' | 'failed'> & { actors: Map<string, { group: THREE.Group; controller: StudioActorController | null }> }
const emptyPlayback: StudioPlayback = { clip: null, time: 0, duration: 0, paused: true }

function ThumbnailChoices({ label, choices, value, onChoose, background = false }: { label: string; choices: { value: string; name: string; image: string }[]; value: string; onChoose: (value: string) => void; background?: boolean }) {
  const [limit, setLimit] = useState(12)
  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const grid = gridRef.current
    if (!background || !grid) return
    const observer = new ResizeObserver(() => {
      const card = grid.querySelector('button')
      if (!card || !grid.clientHeight || !card.offsetHeight) return
      const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length
      const count = Math.ceil(grid.clientHeight / (card.offsetHeight + 8)) * columns
      setLimit(previous => Math.max(previous, count))
    })
    observer.observe(grid)
    return () => observer.disconnect()
  }, [background])
  return <div role="group" aria-label={label} className={background ? styles.backgroundChoices : undefined}>
    <div ref={gridRef} className={styles.choices}>{choices.slice(0, limit).map(choice => <button key={choice.value} type="button" aria-label={choice.name} aria-pressed={value === choice.value} data-choice={choice.value} onClick={() => onChoose(choice.value)}>
      <span className={`${styles.choiceImage} ${background ? styles.sceneImage : ''}`}>{choice.image ? <ProgressiveImage src={choice.image} alt="" fill unoptimized={background} sizes="150px" style={{ objectFit: 'cover' }} /> : <ImageIcon size={24} />}</span>
      <span>{choice.name}</span>
    </button>)}</div>
    {choices.length > limit && <button type="button" className={styles.moreChoices} onClick={() => setLimit(previous => previous + 12)}>Show more · {Math.min(limit, choices.length)} / {choices.length}</button>}
  </div>
}

function Actor({ stage, actor, student, report }: { stage: Stage; actor: StudioActor; student: ChibiCatalogStudent; report: (id: string, status: string) => void }) {
  const initial = useRef(actor)
  const host = useMemo<StudioViewerHost>(() => {
    const group = new THREE.Group(); group.userData.studioActorId = actor.id
    return { ...stage, group, ready: controller => {
      stage.actors.set(actor.id, { group, controller })
      const saved = initial.current
      if (saved.clip && controller.clips.some(clip => clip.name === saved.clip)) { controller.play(saved.clip); controller.seek(saved.time); controller.pause(saved.paused) }
      report(actor.id, 'Ready')
    }, failed: message => report(actor.id, message) }
  }, [stage, actor.id, report])
  useEffect(() => {
    stage.scene.add(host.group); stage.actors.set(actor.id, { group: host.group, controller: null }); report(actor.id, 'Loading model…')
    return () => { host.group.removeFromParent(); stage.actors.delete(actor.id) }
  }, [stage, host, actor.id, report])
  useEffect(() => { host.group.position.set(...actor.position); host.group.rotation.set((actor.tilt ?? 0) * Math.PI / 180, actor.rotation * Math.PI / 180, 0, 'YXZ'); host.group.scale.setScalar(actor.scale) }, [host, actor.position, actor.rotation, actor.tilt, actor.scale])
  return student.model ? <ChibiViewer model={student.model} studio={host} /> : null
}

export function PhotoStudio({ students, backgrounds, loadError, backgroundError }: { students: ChibiCatalogStudent[]; backgrounds: StudioBackground[]; loadError: string | null; backgroundError: string | null }) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'students' | 'pose' | 'scene'>('students')
  const [cameraMode, setCameraMode] = useState(false)
  const cameraModeRef = useRef(cameraMode)
  useEffect(() => { cameraModeRef.current = cameraMode }, [cameraMode])
  const [stage, setStage] = useState<Stage | null>(null)
  const [actors, setActors] = useState<StudioActor[]>([]), [selected, setSelected] = useState<string | null>(null)
  const [layerOrder, setLayerOrder] = useState<StudioLayer[]>([])
  const layers = useMemo(() => studioLayers(actors, layerOrder), [actors, layerOrder])
  const layersRef = useRef(layers)
  useEffect(() => { layersRef.current = layers }, [layers])
  const selectedRef = useRef(selected)
  useEffect(() => { selectedRef.current = selected }, [selected])
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const [search, setSearch] = useState(''), [studentId, setStudentId] = useState(students[0]?.id ?? 0)
  const [backgroundSearch, setBackgroundSearch] = useState(''), [background, setBackground] = useState<string | null>(null)
  const [message, setMessage] = useState('Add students, arrange your scene, and capture a moment.')
  const [backgroundLoading, setBackgroundLoading] = useState(false), [playback, setPlayback] = useState<StudioPlayback>(emptyPlayback)
  const [hiddenControls, setHiddenControls] = useState(false), [restoreGeneration, setRestoreGeneration] = useState(0)
  const [retry, setRetry] = useState<Record<string, number>>({})
  const report = useCallback((id: string, status: string) => setStatuses(previous => ({ ...previous, [id]: status })), [])
  const current = actors.find(actor => actor.id === selected), runtime = selected ? stage?.actors.get(selected) : null
  const filteredStudents = students.filter(student => student.name.toLowerCase().includes(search.toLowerCase()))
  const studentChoice = students.find(student => student.id === studentId)
  const filteredBackgrounds = backgrounds.filter(item => item.label.toLowerCase().includes(backgroundSearch.toLowerCase()))

  useEffect(() => {
    const container = canvasRef.current
    if (!container) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }) }
    catch { setMessage('3D rendering is unavailable. Enable WebGL in your browser.'); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-label', 'Photo studio scene. Drag a student to move; drag empty space to orbit; scroll to zoom.')
    container.appendChild(renderer.domElement)
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100)
    scene.background = new THREE.Color('#202b40'); scene.add(new THREE.HemisphereLight(0xffffff, 0x8891aa, 2.5))
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(2, 4, 5); scene.add(light)
    const controls = new OrbitControls(camera, renderer.domElement)
    camera.position.set(...DEFAULT_STUDIO_CAMERA.position); controls.target.set(...DEFAULT_STUDIO_CAMERA.target)
    controls.enableDamping = true; controls.minDistance = 1; controls.maxDistance = 25; controls.update()
    const state: Stage = { scene, renderer, camera, controls, actors: new Map() }; setStage(state)
    const resize = () => { const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); fitBackground(scene, camera.aspect) }
    const observer = new ResizeObserver(resize); observer.observe(container); resize()
    const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(), point = new THREE.Vector3(), offset = new THREE.Vector3()
    let drag: { id: string; pointerId: number; group: THREE.Group } | null = null
    const cast = (event: PointerEvent) => { const rect = renderer.domElement.getBoundingClientRect(); raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera) }
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) { up(); return }
      if (event.button !== 0 || cameraModeRef.current) return
      cast(event)
      const hits = raycaster.intersectObjects([...state.actors.values()].map(a => a.group), true).filter(hit => {
        let object: THREE.Object3D | null = hit.object
        while (object) { if (!object.visible) return false; object = object.parent }
        return true
      })
      const rank = (object: THREE.Object3D) => {
        let group: THREE.Object3D | null = object
        while (group && !group.userData.studioActorId) group = group.parent
        const id = group?.userData.studioActorId as string | undefined
        const part = state.actors.get(id ?? '')?.controller?.haloMeshes.includes(object as THREE.Mesh) ? 'halo' : 'body'
        return layersRef.current.findIndex(layer => layer.actorId === id && layer.part === part)
      }
      const hit = hits.sort((a, b) => rank(b.object) - rank(a.object) || a.distance - b.distance)[0]
      if (!hit) return
      let group: THREE.Object3D | null = hit.object
      while (group && !group.userData.studioActorId) group = group.parent
      if (!(group instanceof THREE.Group)) return
      const id = group.userData.studioActorId as string
      setSelected(id); setTab('pose'); controls.enabled = false
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), group.position)
      if (raycaster.ray.intersectPlane(plane, point)) offset.copy(group.position).sub(point)
      drag = { id, pointerId: event.pointerId, group }; renderer.domElement.setPointerCapture(event.pointerId); event.stopImmediatePropagation()
    }
    const move = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return
      cast(event)
      if (raycaster.ray.intersectPlane(plane, point)) {
        drag.group.position.copy(point).add(offset)
        const id = drag.id, position = drag.group.position.toArray() as StudioActor['position']
        setActors(previous => previous.map(actor => actor.id === id ? { ...actor, position } : actor))
      }
      event.stopImmediatePropagation()
    }
    const up = () => { const previous = drag; drag = null; controls.enabled = true; if (previous && renderer.domElement.hasPointerCapture(previous.pointerId)) renderer.domElement.releasePointerCapture(previous.pointerId) }
    renderer.domElement.addEventListener('pointerdown', down, true); renderer.domElement.addEventListener('pointermove', move, true)
    renderer.domElement.addEventListener('pointerup', up, true); renderer.domElement.addEventListener('pointercancel', up, true)
    renderer.domElement.addEventListener('lostpointercapture', up); window.addEventListener('blur', up)
    let frame = 0, previous = 0, elapsed = 0
    const render = (time: number) => {
      const delta = previous ? Math.min((time - previous) / 1000, 0.05) : 0; previous = time
      if (!document.hidden) { elapsed += delta; scene.userData.chibiElapsedSeconds = elapsed; controls.update(delta); renderStudio(renderer, scene, camera, state.actors, layersRef.current) }
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    const interval = window.setInterval(() => setPlayback(state.actors.get(selectedRef.current ?? '')?.controller?.playback() ?? emptyPlayback), 100)
    return () => {
      cancelAnimationFrame(frame); clearInterval(interval); observer.disconnect(); window.removeEventListener('blur', up)
      renderer.domElement.removeEventListener('pointerdown', down, true); renderer.domElement.removeEventListener('pointermove', move, true)
      renderer.domElement.removeEventListener('pointerup', up, true); renderer.domElement.removeEventListener('pointercancel', up, true); renderer.domElement.removeEventListener('lostpointercapture', up)
      controls.dispose(); if (scene.background instanceof THREE.Texture) scene.background.dispose(); renderer.dispose(); renderer.domElement.remove()
    }
  }, [])

  useEffect(() => {
    if (!stage) return
    let cancelled = false
    if (stage.scene.background instanceof THREE.Texture) stage.scene.background.dispose()
    stage.scene.background = new THREE.Color('#202b40')
    const item = backgrounds.find(item => item.key === background)
    if (!item) { setBackgroundLoading(false); return }
    setBackgroundLoading(true)
    new THREE.TextureLoader().load(item.url, texture => {
      if (cancelled) { texture.dispose(); return }
      texture.colorSpace = THREE.SRGBColorSpace; stage.scene.background = texture; fitBackground(stage.scene, stage.camera.aspect); setBackgroundLoading(false)
    }, undefined, () => { if (!cancelled) { setBackgroundLoading(false); setMessage('This background could not be loaded. Choose another background or retry.') } })
    return () => { cancelled = true }
  }, [stage, background, backgrounds])

  function addStudent() {
    const student = studentChoice
    if (!student || actors.length >= 12) return
    const id = crypto.randomUUID()
    setActors(previous => [...previous, { id, studentId: student.id, position: [(previous.length % 3 - 1) * 1.6, 0, -Math.floor(previous.length / 3)], rotation: 0, scale: 1, clip: null, time: 0, paused: false }]); setSelected(id); setTab('pose'); setPlayback(emptyPlayback)
  }
  function chooseActor(id: string) { setSelected(id); setPlayback(stage?.actors.get(id)?.controller?.playback() ?? emptyPlayback); setTab('pose') }
  function removeActor(id: string) { setActors(previous => previous.filter(actor => actor.id !== id)); if (selected === id) { setSelected(actors.find(actor => actor.id !== id)?.id ?? null); setPlayback(emptyPlayback) } }
  function nudgeActor(horizontal: number, vertical: number) {
    if (!stage || !current) return
    stage.camera.updateMatrixWorld()
    const right = new THREE.Vector3().setFromMatrixColumn(stage.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(stage.camera.matrixWorld, 1)
    updateActor({ position: new THREE.Vector3(...current.position).addScaledVector(right, horizontal * 0.2).addScaledVector(up, vertical * 0.2).toArray() as StudioActor['position'] })
  }
  function updateActor(update: Partial<StudioActor>) { setActors(previous => previous.map(actor => actor.id === selected ? { ...actor, ...update } : actor)) }
  function orderLayer(part: StudioLayer['part'], target: 'front' | 'back' | string) {
    if (!current) return
    const layer = { actorId: current.id, part }, next = layers.filter(entry => entry.actorId !== current.id || entry.part !== part)
    const index = target === 'front' ? next.length : target === 'back' ? 0 : next.findIndex(entry => layerKey(entry) === target) + 1
    next.splice(index, 0, layer); setLayerOrder(next)
    setMessage(`${layerLabel(layer)} layer order updated. Positions stay the same.`)
  }
  function layerKey(layer: StudioLayer) { return `${layer.actorId}:${layer.part}` }
  function layerLabel(layer: StudioLayer) { const index = actors.findIndex(actor => actor.id === layer.actorId); return `${index + 1}. ${students.find(student => student.id === actors[index]?.studentId)?.name ?? 'Student'} · ${layer.part === 'body' ? 'Body' : 'Halo'}` }
  function cameraPreset(preset: 'front' | 'wide' | 'portrait') {
    if (!stage) return
    stage.camera.position.set(0, preset === 'portrait' ? 1.8 : 2.4, preset === 'wide' ? 12 : preset === 'portrait' ? 5 : 8); stage.controls.target.set(0, 1, 0); stage.controls.update()
  }
  function saveScene() {
    if (!stage) return
    const scene: StudioScene = { version: 1, background, layers, actors: actors.map(actor => {
      const state = stage.actors.get(actor.id)?.controller?.playback()
      return state ? { ...actor, clip: state.clip, time: state.time, paused: state.paused } : actor
    }), camera: { position: stage.camera.position.toArray() as [number, number, number], target: stage.controls.target.toArray() as [number, number, number] } }
    try { localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(scene)); setMessage('Scene saved in this browser.') }
    catch { setMessage('Your browser could not save this scene. Check available browser storage.') }
  }
  function loadScene() {
    try {
      const text = localStorage.getItem(STUDIO_STORAGE_KEY)
      if (!text) { setMessage('No saved scene in this browser yet.'); return }
      const scene = parseStudioScene(text), available = scene.actors.filter(a => students.some(s => s.id === a.studentId && s.model))
      setStatuses({}); setActors(available); setSelected(available[0]?.id ?? null); setRestoreGeneration(v => v + 1)
      setLayerOrder(studioLayers(available, scene.layers))
      setBackground(backgrounds.some(b => b.key === scene.background) ? scene.background : null)
      stage?.camera.position.set(...scene.camera.position); stage?.controls.target.set(...scene.camera.target); stage?.controls.update()
      setMessage(available.length === scene.actors.length ? 'Saved scene restored.' : 'Scene restored. Students without available assets were omitted.')
    } catch { setMessage('The saved scene could not be restored.') }
  }
  function exportPhoto() {
    if (!stage || backgroundLoading || actors.some(a => statuses[a.id] !== 'Ready')) return
    renderStudio(stage.renderer, stage.scene, stage.camera, stage.actors, layers)
    stage.renderer.domElement.toBlob(blob => {
      if (!blob) { setMessage('The photo could not be exported.'); return }
      const url = URL.createObjectURL(blob), link = document.createElement('a')
      link.href = url; link.download = 'stratonas-studio.png'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Photo exported as PNG.')
    }, 'image/png')
  }

  return <div className={`${styles.studio} ${hiddenControls ? styles.clean : ''}`}>
    <section className={styles.workspace} aria-label="Scene workspace">
      <div className={styles.stageTools}>
        <span>{actors.length ? `${actors.length} student${actors.length === 1 ? '' : 's'} in your scene` : 'Your canvas, your story'}</span>
        <div role="group" aria-label="Scene interaction mode"><button type="button" aria-pressed={!cameraMode} onClick={() => setCameraMode(false)}><Move size={16} /> Move students</button><button type="button" aria-pressed={cameraMode} onClick={() => setCameraMode(true)}><Camera size={16} /> Move camera</button></div>
      </div>
      <div className={styles.canvasWrap}><div className={styles.stage} ref={canvasRef} data-studio-stage />
        {!actors.length && <div className={styles.hint}><Users size={32} /><strong>Start with your favorite students</strong><span>Choose a student in the Students tab, then add them to your scene.</span><button type="button" onClick={() => setTab('students')}>Choose a student</button></div>}
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={() => setHiddenControls(v => !v)}>{hiddenControls ? 'Show controls' : 'Hide controls'}</button>
        <button type="button" className={styles.export} onClick={exportPhoto} disabled={!stage || backgroundLoading || actors.some(a => statuses[a.id] !== 'Ready')}><Download size={16} />Export PNG</button>
        {!hiddenControls && <><button type="button" onClick={saveScene} disabled={!stage}>Save scene</button><button type="button" onClick={loadScene} disabled={!stage}>Open saved scene</button></>}
      </div>
      <p role="status" className={styles.message}>{backgroundLoading ? 'Loading background…' : message}</p>
      <details className={styles.instructions}><summary>How to move around</summary><p>Move students: drag a student, or use the position buttons in Pose. Move camera: drag to orbit. Pinch or scroll to zoom; use two fingers or right-drag to pan.</p></details>
      {stage && actors.map(actor => { const student = students.find(s => s.id === actor.studentId); return student ? <Actor key={`${restoreGeneration}:${actor.id}:${retry[actor.id] ?? 0}`} stage={stage} actor={actor} student={student} report={report} /> : null })}
    </section>
    {!hiddenControls && <aside className={styles.panel} aria-label="Studio controls">
      <div className={styles.tabs} role="tablist" aria-label="Studio editor" onKeyDown={event => {
        const ids = ['students', 'pose', 'scene'] as const
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (ids.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3
        setTab(ids[index]); document.getElementById(`studio-tab-${ids[index]}`)?.focus()
      }}>
        {([['students', 'Students', Users], ['pose', 'Pose', SlidersHorizontal], ['scene', 'Scene', ImageIcon]] as const).map(([id, label, Icon]) => <button key={id} id={`studio-tab-${id}`} type="button" role="tab" tabIndex={tab === id ? 0 : -1} aria-selected={tab === id} aria-controls={`studio-panel-${id}`} onClick={() => setTab(id)}><Icon size={17} />{label}</button>)}
      </div>
      <div className={styles.panelBody}>
      {loadError && <p role="alert">{loadError}</p>}
      <section id="studio-panel-students" role="tabpanel" aria-labelledby="studio-tab-students" hidden={tab !== 'students'}><h2>Add students <span>{actors.length} / 12</span></h2>
        <label>Find a student<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…" /></label>
        <ThumbnailChoices key={`students:${search}`} label="Choose a student" choices={filteredStudents.map(student => ({ value: String(student.id), name: student.name, image: imageSrc(student.image) }))} value={String(studentId)} onChoose={value => setStudentId(Number(value))} />
        <p className={styles.note}>Selected: <strong>{studentChoice?.name ?? 'Choose a student'}</strong></p>
        <button type="button" className={styles.primary} onClick={addStudent} disabled={!stage || !studentChoice || actors.length >= 12}>Add student</button>
        {!filteredStudents.length && <p className={styles.note}>No students match your search. Try another name.</p>}
        <h3 className={styles.subheading}>In your scene <span>Tap a student to edit their pose</span></h3>
        <div className={styles.cast}>{actors.map((actor, i) => { const student = students.find(s => s.id === actor.studentId); return <div key={actor.id} className={styles.castRow} data-selected={actor.id === selected}>
          <button type="button" aria-pressed={actor.id === selected} onClick={() => chooseActor(actor.id)}>{student && imageSrc(student.image) && <span className={styles.portrait}><ProgressiveImage src={imageSrc(student.image)} alt="" fill sizes="40px" /></span>}<span>{i + 1}. {student?.name}<small>{statuses[actor.id] ?? 'Loading model…'}</small></span></button>
          <button type="button" className={styles.remove} aria-label={`Remove ${student?.name ?? 'student'} ${i + 1}`} title="Remove from scene" onClick={() => removeActor(actor.id)}><Trash2 size={17} /></button>
        </div> })}</div>
        {!actors.length && <p className={styles.note}>Added students appear here. You can edit or remove them at any time.</p>}
      </section>
      <section id="studio-panel-pose" role="tabpanel" aria-labelledby="studio-tab-pose" hidden={tab !== 'pose'}>
      {current ? <><div className={styles.selectedHeading}><div><p>Editing student</p><h2>{students.find(student => student.id === current.studentId)?.name}</h2></div><button type="button" className={styles.remove} onClick={() => removeActor(current.id)}><Trash2 size={16} />Remove student</button></div>
        <h3 className={styles.subheading}>Position</h3>
        <div className={styles.nudge} aria-label="Move selected student"><button type="button" onClick={() => nudgeActor(-1, 0)}><ArrowLeft size={16} />Left</button><button type="button" onClick={() => nudgeActor(0, 1)}><ArrowUp size={16} />Up</button><button type="button" onClick={() => nudgeActor(0, -1)}><ArrowDown size={16} />Down</button><button type="button" onClick={() => nudgeActor(1, 0)}><ArrowRight size={16} />Right</button></div>
        <h3 className={styles.subheading}>Who appears in front?</h3>
        <p className={styles.note}>Body and halo are separate layers. Their order stays fixed when you move the camera.</p>
        {(['body', 'halo'] as const).map(part => <div key={part}>
          <label>{part === 'body' ? 'Place body in front of' : 'Place halo in front of'}<select value="" disabled={!runtime?.controller || (part === 'halo' && !runtime.controller.haloMeshes.length)} onChange={event => orderLayer(part, event.target.value)}><option value="">Choose a layer…</option>{[...layers].reverse().filter(layer => (layer.actorId !== current.id || layer.part !== part) && (layer.part === 'body' || stage?.actors.get(layer.actorId)?.controller?.haloMeshes.length)).map(layer => <option key={layerKey(layer)} value={layerKey(layer)}>{layerLabel(layer)}</option>)}</select></label>
          <div className={styles.media}><button type="button" disabled={!runtime?.controller || (part === 'halo' && !runtime.controller.haloMeshes.length)} onClick={() => orderLayer(part, 'front')}>{part === 'body' ? 'Bring to front' : 'Halo to front'}</button><button type="button" disabled={!runtime?.controller || (part === 'halo' && !runtime.controller.haloMeshes.length)} onClick={() => orderLayer(part, 'back')}>{part === 'body' ? 'Send to back' : 'Halo to back'}</button></div>
          {part === 'halo' && runtime?.controller && !runtime.controller.haloMeshes.length && <p className={styles.note}>This asset has no separately identified halo.</p>}
        </div>)}
        <details><summary>Layer order · front to back</summary><ol aria-label="Layer order, front to back">{[...layers].reverse().filter(layer => layer.part === 'body' || stage?.actors.get(layer.actorId)?.controller?.haloMeshes.length).map(layer => <li key={layerKey(layer)}>{layerLabel(layer)}</li>)}</ol></details>
        {statuses[current.id] && statuses[current.id] !== 'Ready' && statuses[current.id] !== 'Loading model…' && <button type="button" onClick={() => setRetry(v => ({ ...v, [current.id]: (v[current.id] ?? 0) + 1 }))}>Retry model</button>}
        <label>Rotation <output>{current.rotation}°</output><input aria-label="Student rotation" type="range" min="-180" max="180" value={current.rotation} onChange={e => updateActor({ rotation: Number(e.target.value) })} /></label>
        <label>Tilt <output>{Math.abs(current.tilt ?? 0)}° {(current.tilt ?? 0) > 0 ? 'forward' : (current.tilt ?? 0) < 0 ? 'backward' : ''}</output><input aria-label="Student tilt" type="range" min="-90" max="90" value={current.tilt ?? 0} onChange={e => updateActor({ tilt: Number(e.target.value) })} /></label>
        <div className={styles.media}><button type="button" onClick={() => updateActor({ tilt: Math.min(90, (current.tilt ?? 0) + 10) })}>Tilt forward</button><button type="button" onClick={() => updateActor({ tilt: Math.max(-90, (current.tilt ?? 0) - 10) })}>Tilt backward</button><button type="button" onClick={() => updateActor({ tilt: 0 })}>Reset tilt</button></div>
        <p className={styles.note}>Rotation and tilt affect only this student, including their halo. Move camera changes the view of the whole scene.</p>
        <label>Size <output>{current.scale.toFixed(2)}×</output><input aria-label="Student size" type="range" min="0.1" max="3" step="0.05" value={current.scale} onChange={e => updateActor({ scale: Number(e.target.value) })} /></label>
        <label>Animation<select value={playback.clip ?? ''} disabled={!runtime?.controller?.clips.length} onChange={e => { runtime?.controller?.play(e.target.value); setPlayback(runtime?.controller?.playback() ?? emptyPlayback) }}><option value="" disabled>{runtime?.controller?.clips.length ? 'Choose an animation' : 'No animations available'}</option>{runtime?.controller?.clips.map(clip => <option key={clip.name} value={clip.name}>{clip.name.replace(/^(CH\d+|[^_]+_Original)_?/i, '').replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2')}</option>)}</select></label>
        <div className={styles.media}><button type="button" disabled={!playback.clip} onClick={() => { runtime?.controller?.pause(!playback.paused); setPlayback(runtime?.controller?.playback() ?? emptyPlayback) }}>{playback.paused ? 'Play animation' : 'Pause pose'}</button><button type="button" disabled={!playback.clip} onClick={() => { runtime?.controller?.seek(0); setPlayback(runtime?.controller?.playback() ?? emptyPlayback) }}>Rewind</button></div>
        <label>Pose timeline <output>{playback.time.toFixed(2)} / {playback.duration.toFixed(2)} s</output><input aria-label="Pose timeline" type="range" min="0" max={playback.duration || 1} step="0.01" disabled={!playback.clip} value={Math.min(playback.time, playback.duration)} onChange={e => { runtime?.controller?.pause(true); runtime?.controller?.seek(Number(e.target.value)); setPlayback(runtime?.controller?.playback() ?? emptyPlayback) }} /></label>
        <p className={styles.note}>Pause or scrub to keep a pose. Each student has independent playback.</p>
        <details><summary>Advanced placement</summary>{(['X', 'Y', 'Z'] as const).map((axis, i) => <label key={axis}>{axis}<input aria-label={`Student ${axis}`} type="number" min="-20" max="20" step="0.1" value={Number(current.position[i].toFixed(2))} onChange={e => { const position = [...current.position] as StudioActor['position']; position[i] = Math.max(-20, Math.min(20, Number(e.target.value))); updateActor({ position }) }} /></label>)}</details>
      </> : <div className={styles.emptyPanel}><SlidersHorizontal size={30} /><h2>Choose a student to pose</h2><p>Select a student in your scene or add one from the Students tab.</p><button type="button" onClick={() => setTab('students')}>Go to Students</button></div>}
      </section>
      <section id="studio-panel-scene" className={styles.scenePanel} role="tabpanel" aria-labelledby="studio-tab-scene" hidden={tab !== 'scene'}><h2>Background & camera</h2>
        {backgroundError && <p role="status" className={styles.note}>{backgroundError}</p>}
        <label>Find a background<input type="search" value={backgroundSearch} onChange={e => setBackgroundSearch(e.target.value)} placeholder="Classroom, beach, night…" /></label>
        <ThumbnailChoices key={`backgrounds:${backgroundSearch}`} label="Choose a background" background choices={[{ value: '', name: 'Plain studio', image: '' }, ...filteredBackgrounds.map(item => ({ value: item.key, name: item.label, image: item.url }))]} value={background ?? ''} onChoose={value => setBackground(value || null)} />
        {!filteredBackgrounds.length && <p className={styles.note}>No backgrounds match your search. Try another name.</p>}
        <p className={styles.note}>{backgrounds.length} BAAD backgrounds · Cropped to fill the photo</p>
        <div className={styles.media}>{(['front', 'wide', 'portrait'] as const).map(preset => <button key={preset} type="button" onClick={() => cameraPreset(preset)}>{preset[0].toUpperCase() + preset.slice(1)} view</button>)}</div>
      </section>
      </div>
      <p className={styles.editorHint}>Scroll this panel for more controls ↓</p>
    </aside>}
  </div>
}

function fitBackground(scene: THREE.Scene, aspect: number) {
  if (!(scene.background instanceof THREE.Texture)) return
  const texture = scene.background, image = texture.image as { width: number; height: number }, imageAspect = image.width / image.height
  texture.repeat.set(Math.min(1, aspect / imageAspect), Math.min(1, imageAspect / aspect))
  texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2); texture.updateMatrix()
}
