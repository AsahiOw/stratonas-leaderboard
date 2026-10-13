import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { PerspectiveCamera, TOUCH, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { isolatePlaygroundPointer, studentCameraView } from './playground-camera'
import { playgroundCameraDamping } from './playground-quality'

const source = readFileSync(new URL('./PlaygroundJoystick.tsx', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText

// Run the component's actual pointer handlers with captured refs and browser listeners.
function joystick(disabled = false) {
  const refs: { current: unknown }[] = [], effects: (() => (() => void))[] = [], listeners = new Map<string, () => void>(), captured = new Set<number>(), moves: number[][] = []
  const react = {
    useRef: (current: unknown) => { const ref = { current }; refs.push(ref); return ref },
    useCallback: (callback: unknown) => callback,
    useEffect: (effect: () => (() => void)) => effects.push(effect),
    createElement: (_type: unknown, props: Record<string, unknown>) => ({ props }),
  }
  const browser = { addEventListener: (name: string, callback: () => void) => listeners.set(name, callback), removeEventListener: (name: string) => listeners.delete(name) }
  const exports: Record<string, (...args: unknown[]) => unknown> = {}
  new Function('require', 'exports', 'React', 'window', 'document', js)(
    (name: string) => name === 'react' ? react : { default: {} }, exports, react, browser, browser,
  )
  const element = exports.PlaygroundJoystick({ disabled, onMove: (direction: number[]) => moves.push(direction) }) as { props: Record<string, (event: unknown) => void> }
  const surface = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 100, height: 100 }),
    setPointerCapture: (id: number) => captured.add(id), hasPointerCapture: (id: number) => captured.has(id), releasePointerCapture: (id: number) => captured.delete(id),
  }
  const thumb = { style: { transform: '' } }; refs[0].current = surface; refs[1].current = thumb
  const cleanup = effects.map(effect => effect())
  const event = (x: number, y: number, pointerId = 1) => ({ button: 0, clientX: 60 + x, clientY: 70 + y, pointerId, currentTarget: surface, preventDefault: () => {} })
  return { props: element.props, event, moves, captured, thumb, listeners, cleanup, direction: exports.joystickDirection as (x: number, y: number, travel: number) => number[] }
}

test('joystick ignores center jitter, maps up to forward and clamps diagonals to the unit circle', () => {
  const { direction } = joystick()
  assert.deepEqual(direction(2, -2, 28), [0, 0])
  assert.deepEqual(direction(0, -28, 28), [0, 1])
  assert.deepEqual(direction(28, 0, 28), [1, -0])
  const diagonal = direction(100, -100, 28)
  assert.ok(Math.abs(Math.hypot(...diagonal) - 1) < 1e-10); assert.ok(diagonal[0] > 0 && diagonal[1] > 0)
})

test('held movement follows the captured pointer, ignores a second finger and stops on release', () => {
  const j = joystick()
  j.props.onPointerDown(j.event(0, -40)); assert.deepEqual(j.moves.at(-1), [0, 1]); assert.ok(j.captured.has(1))
  j.props.onPointerDown(j.event(-28, 0, 2)); j.props.onPointerMove(j.event(-28, 0, 2)); j.props.onPointerUp(j.event(0, 0, 2))
  assert.deepEqual(j.moves.at(-1), [0, 1]); assert.ok(j.captured.has(1))
  j.props.onPointerMove(j.event(-40, 0)); assert.deepEqual(j.moves.at(-1), [-1, -0])
  j.props.onPointerUp(j.event(0, 0)); assert.deepEqual(j.moves.at(-1), [0, 0]); assert.equal(j.captured.size, 0)
  assert.equal(j.thumb.style.transform, 'translate(-50%, -50%)')
  j.props.onPointerMove(j.event(28, 0)); assert.deepEqual(j.moves.at(-1), [0, 0])
})

test('cancellation, lost capture, blur, hidden page, resize and unmount all reset held input', () => {
  for (const stop of ['onPointerCancel', 'onLostPointerCapture', 'blur', 'visibilitychange', 'resize', 'unmount']) {
    const j = joystick(); j.props.onPointerDown(j.event(28, 0))
    if (stop === 'unmount') j.cleanup.forEach(cleanup => cleanup())
    else if (stop.startsWith('on')) j.props[stop](j.event(0, 0))
    else j.listeners.get(stop)!()
    assert.deepEqual(j.moves.at(-1), [0, 0], stop); assert.equal(j.captured.size, 0, stop)
    assert.equal(j.thumb.style.transform, 'translate(-50%, -50%)', stop)
  }
})

test('a paused joystick cannot produce movement', () => {
  const j = joystick(true)
  j.props.onPointerDown(j.event(28, 0)); j.props.onPointerMove(j.event(0, -28))
  assert.equal(j.moves.length, 0)
})

function studentPanel() {
  const source = readFileSync(new URL('./StudentPlayground.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('<section className={styles.studentControls}')
  const opening = source.slice(start, source.indexOf('<div className={styles.controlHeading}', start)).trim()
  const js = ts.transpileModule(`export function panel() { return ${opening.slice(0, -1)} /> }`, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText
  const exports: { panel?: () => { props: Record<string, (event: unknown) => void> } } = {}
  new Function('exports', 'React', 'styles', 'isolatePlaygroundPointer', js)(exports, { createElement: (_type: unknown, props: unknown) => ({ props }) }, {}, isolatePlaygroundPointer)
  return exports.panel!().props
}

function touchCamera(firstPerson = false) {
  const document = new EventTarget(), captured = new Set<number>()
  const canvas = Object.assign(new EventTarget(), {
    style: {}, clientWidth: 390, clientHeight: 844, ownerDocument: document, getRootNode: () => document,
    setPointerCapture: (id: number) => captured.add(id), releasePointerCapture: (id: number) => captured.delete(id),
  })
  const camera = new PerspectiveCamera(38, 390 / 844, 0.1, 450), controls = new OrbitControls(camera, canvas as unknown as HTMLElement)
  controls.enablePan = false; controls.touches.ONE = TOUCH.ROTATE; controls.touches.TWO = TOUCH.DOLLY_ROTATE
  studentCameraView(camera, controls, [0, 0], 0, firstPerson, new Vector3(3.5, 7, 6))
  const touch = (type: string, x: number, y: number, id: number, primary = true, target = document) => {
    const event = Object.assign(new Event(type), { pointerType: 'touch', pointerId: id, isPrimary: primary, pageX: x, pageY: y, clientX: x, clientY: y, button: 0 })
    target.dispatchEvent(event)
  }
  return { camera, controls, canvas, touch, offset: () => camera.position.clone().sub(controls.target) }
}

test('moving and looking use independent fingers in either order and camera perspective', () => {
  const panel = studentPanel()
  for (const documentRoot of [false, true]) for (const firstPerson of [false, true]) for (const joystickFirst of [false, true]) for (const release of ['onPointerUp', 'onPointerCancel']) {
    const j = joystick(), c = touchCamera(firstPerson)
    const ui = (handler: string, x: number, y: number) => {
      let stopped = false
      // With Next's document root, other document listeners survive stopPropagation.
      const event = { ...j.event(x, y, 2), stopPropagation: () => { if (!documentRoot) stopped = true }, nativeEvent: { stopImmediatePropagation: () => { stopped = true } } }
      j.props[handler](event); panel[handler]?.(event)
      if (!stopped) c.touch(handler.replace('onPointer', 'pointer').toLowerCase(), event.clientX, event.clientY, 2, joystickFirst)
    }
    if (joystickFirst) ui('onPointerDown', 0, -28)
    c.touch('pointerdown', 260, 180, 1, !joystickFirst, c.canvas)
    if (!joystickFirst) ui('onPointerDown', 0, -28)
    const before = c.offset()
    ui('onPointerMove', 20, -28)
    assert.ok(c.offset().distanceTo(before) < 1e-9, 'joystick motion must not turn the camera')
    assert.ok(Math.hypot(...j.moves.at(-1)!) > 0, 'the joystick must keep moving the student')
    c.touch('pointermove', 290, 190, 1, !joystickFirst)
    assert.ok(c.offset().distanceTo(before) > 0.001, 'the other finger must still turn the camera')
    const turned = c.offset()
    ui(release, 20, -28)
    assert.deepEqual(j.moves.at(-1), [0, 0]); assert.ok(c.offset().distanceTo(turned) < 1e-9)
    c.touch('pointermove', 310, 190, 1, !joystickFirst)
    assert.ok(c.offset().distanceTo(turned) > 0.001, 'looking must continue after releasing the joystick')
    c.touch('pointerup', 310, 190, 1); c.controls.dispose(); j.cleanup.forEach(cleanup => cleanup())
  }
})

test('releasing the look finger preserves movement and canvas-only pinch still zooms', () => {
  const panel = studentPanel(), j = joystick(), c = touchCamera()
  const ui = (handler: string, x: number, y: number) => {
    let stopped = false
    const event = { ...j.event(x, y, 2), stopPropagation: () => {}, nativeEvent: { stopImmediatePropagation: () => { stopped = true } } }
    j.props[handler](event); panel[handler]?.(event)
    if (!stopped) c.touch(handler.replace('onPointer', 'pointer').toLowerCase(), event.clientX, event.clientY, 2, false)
  }
  c.touch('pointerdown', 260, 180, 1, true, c.canvas); ui('onPointerDown', 0, -28)
  c.touch('pointerup', 260, 180, 1); ui('onPointerMove', 40, 0)
  assert.deepEqual(j.moves.at(-1), [1, -0]); assert.ok(j.captured.has(2))
  ui('onPointerCancel', 28, 0); assert.deepEqual(j.moves.at(-1), [0, 0])
  const distance = c.offset().length()
  c.touch('pointerdown', 220, 180, 3, true, c.canvas); c.touch('pointerdown', 300, 180, 4, false, c.canvas)
  c.touch('pointermove', 330, 180, 4, false)
  assert.ok(c.offset().length() < distance, 'two fingers starting on the canvas must retain pinch zoom')
  c.touch('pointerup', 330, 180, 4); c.touch('pointerup', 220, 180, 3)
  c.controls.dispose(); j.cleanup.forEach(cleanup => cleanup())
})

test('camera easing settles in the same time at low and high frame rates', () => {
  const angles: number[] = []
  for (const fps of [15, 30, 60, 120]) {
    const c = touchCamera(), before = c.controls.getAzimuthalAngle()
    c.controls.enableDamping = true; c.controls.dampingFactor = playgroundCameraDamping(1 / fps)
    c.touch('pointerdown', 250, 200, 1, true, c.canvas); c.touch('pointermove', 290, 200, 1); c.touch('pointerup', 290, 200, 1)
    for (let frame = 0; frame < fps; frame++) c.controls.update(1 / fps)
    const angle = c.controls.getAzimuthalAngle()
    assert.ok(Math.abs(angle - (before - Math.PI * 2 * 40 / 844)) < 0.0001)
    angles.push(angle); c.controls.dispose()
  }
  assert.ok(Math.max(...angles) - Math.min(...angles) < 0.0001)
})
