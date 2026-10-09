import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

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
