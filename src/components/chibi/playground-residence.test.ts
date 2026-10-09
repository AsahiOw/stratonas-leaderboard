import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { emptyChibiProfile } from '@/lib/chibi/types'
import { initialPlaygroundMapping } from '@/lib/chibi/playground-mapping'
import { PlaygroundSimulation, PLAYGROUND_CAPACITY, PLAYGROUND_EXIT, playgroundStudentName, STUDENT_SPACING, walkable } from '@/lib/chibi/playground-simulation'
import { sectionAt } from '@/lib/chibi/playground-layout'

const source = readFileSync(new URL('./StudentPlayground.tsx', import.meta.url), 'utf8')
const js = (value: string) => ts.transpileModule(value, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const mapping = initialPlaygroundMapping('source', emptyChibiProfile())
for (const role of ['idle', 'walk', 'pickup'] as const) mapping.roles[role] = [{ clip: role, loop: true }]
const flush = async () => { await Promise.resolve(); await Promise.resolve() }
const advance = async (sim: PlaygroundSimulation, seconds: number) => { for (let i = 0; i < seconds * 20; i++) { sim.tick(0.05); await flush() } }
const simulation = () => new PlaygroundSimulation(async () => true, () => 2, () => 0.8)

// Exercise the actual UI invitation handler, including its departure/replacement guard.
function inviteFromUI(sim: PlaygroundSimulation, pending: { leavingId: number; student: { id: number; name: string } | null; sectionId: string } | null, swap: number | null) {
  const runtime = { simulation: sim, pendingArrival: pending }, student = { id: 22, name: 'New visitor', model: {} }
  const queue = new Function(js(source.slice(source.indexOf('function queueVisitor('), source.indexOf('function LocalClock('))) + '; return queueVisitor')()
  const block = source.slice(source.indexOf('  const invite ='), source.indexOf('  const togglePause ='))
  new Function('runtime', 'choiceStudent', 'duplicate', 'swap', 'mappingFor', 'mappings', 'queueVisitor', 'PLAYGROUND_CAPACITY', 'playgroundStudentName', 'setMessage', 'setTransitioning', 'setSelected', 'setInvited', 'setVisitors', js(block) + '; invite()')(
    runtime, student, null, swap, () => mapping, {}, queue, PLAYGROUND_CAPACITY, playgroundStudentName, () => {}, () => {}, () => {}, () => {}, () => {},
  )
  return runtime
}

test('the invitation UI uses an open slot while a different student is still going home', async () => {
  const sim = simulation(); sim.add(1, 'First', mapping); sim.add(2, 'Second', mapping); sim.ready(1); sim.ready(2); await flush()
  sim.depart(1)
  const pending = { leavingId: 1, student: null, sectionId: 'lounge' }
  const runtime = inviteFromUI(sim, pending, null)
  assert.equal(sim.actors.get(1)!.leaving, true)
  assert.equal(sim.actors.has(22), true, 'a pending departure must not disable invitations below capacity')
  assert.equal(runtime.pendingArrival, pending)
  assert.deepEqual(sim.actors.get(22)!.position, PLAYGROUND_EXIT)
})

test('a full hall swaps only the explicitly chosen resident', async () => {
  const sim = simulation()
  for (let id = 1; id <= PLAYGROUND_CAPACITY; id++) { sim.add(id, `Student ${id}`, mapping); sim.ready(id) }
  await flush(); inviteFromUI(sim, null, null)
  assert.ok([...sim.actors.values()].every(actor => !actor.leaving), 'capacity must not silently choose the first resident')
  const runtime = inviteFromUI(sim, null, 9)
  assert.equal(sim.actors.get(9)!.leaving, true); assert.equal(sim.actors.get(1)!.leaving, false)
  assert.equal(sim.actors.has(22), false); assert.equal(runtime.pendingArrival!.leavingId, 9)
})

test('loaded visitors first appear at the door and walk to their reserved room', async () => {
  const sim = simulation(); assert.equal(sim.invite(1, 'First', mapping), true)
  const actor = sim.actors.get(1)!, target = [...actor.arrivalTarget!]
  assert.equal(actor.opacity, 0); assert.deepEqual(actor.position, PLAYGROUND_EXIT)
  sim.ready(1); await flush(); sim.tick(0.05); await flush()
  assert.equal(actor.opacity, 1); assert.equal(actor.state, 'walking'); assert.deepEqual(actor.position, PLAYGROUND_EXIT)
  sim.roam(1, false); await advance(sim, 0.5)
  assert.notDeepEqual(actor.position, PLAYGROUND_EXIT); assert.notDeepEqual(actor.position, target)
  actor.roam = false; await advance(sim, 60)
  assert.equal(actor.arrivalTarget, null); assert.equal(sectionAt(actor.position)?.id, actor.sectionId)
})

test('concurrent arrivals wait for entrance clearance and keep room and body reservations', async () => {
  const sim = simulation()
  for (let id = 1; id <= 2; id++) { sim.invite(id, `Student ${id}`, mapping); sim.ready(id, 0.55); sim.actors.get(id)!.roam = false }
  await flush(); assert.equal(sim.sectionPopulation('lounge'), 2)
  for (let frame = 0; frame < 1200; frame++) {
    sim.tick(0.05); await flush()
    const visible = [...sim.actors.values()].filter(actor => actor.opacity > 0)
    for (const actor of visible) assert.ok(walkable(actor.position, actor.radius))
    if (visible.length === 2) assert.ok(Math.hypot(visible[0].position[0] - visible[1].position[0], visible[0].position[1] - visible[1].position[1]) >= STUDENT_SPACING - 0.002)
  }
  assert.ok([...sim.actors.values()].every(actor => !actor.arrivalTarget && actor.opacity === 1))
})

test('a failed incoming model keeps its entrance reservation and can be retried or sent home', async () => {
  const sim = simulation(); sim.invite(1, 'First', mapping); sim.fail(1, 'Model failed')
  const actor = sim.actors.get(1)!
  assert.equal(actor.opacity, 0); assert.ok(actor.arrivalTarget); assert.equal(sim.sectionPopulation('lounge'), 1)
  sim.ready(1); await flush(); sim.tick(0.05); await flush(); assert.equal(actor.state, 'walking')
  await advance(sim, 0.5); sim.fail(1, 'Walk animation failed'); sim.ready(1); await flush()
  assert.equal(actor.opacity, 0); assert.deepEqual(actor.position, PLAYGROUND_EXIT)
  sim.tick(0.05); await flush(); assert.equal(actor.state, 'walking'); assert.equal(actor.opacity, 1)
  sim.invite(2, 'Second', mapping); sim.ready(2); await flush()
  assert.equal(sim.depart(2), true); assert.equal(sim.actors.has(2), false)
})

test('users can select multiple departures and invite into another open slot immediately', async () => {
  const sim = simulation()
  for (let id = 1; id <= 3; id++) { sim.add(id, `Student ${id}`, mapping); sim.ready(id) }
  await flush(); assert.equal(sim.depart(1), true); assert.equal(sim.depart(2), true)
  assert.equal(sim.invite(4, 'Fourth', mapping), true)
  assert.equal(sim.actors.get(1)!.leaving, true); assert.equal(sim.actors.get(2)!.leaving, true)
})

test('pickup faces the camera once and dragging preserves that orientation', async () => {
  const sim = simulation(); sim.add(1, 'First', mapping); sim.ready(1); await flush()
  const actor = sim.actors.get(1)!, heading = 1.25
  assert.equal(sim.react(1, 'pickup', heading), true); await advance(sim, 0.5); assert.equal(actor.angle, heading)
  assert.equal(sim.beginDrag(1, heading), true); sim.drag(1, [-4, 1]); await advance(sim, 5)
  assert.equal(actor.state, 'dragging'); assert.equal(actor.angle, heading)
})

test('the room roster follows the actual location and groups waiting arrivals at Entrance', () => {
  const roster = readFileSync(new URL('./PlaygroundRoster.tsx', import.meta.url), 'utf8')
  const block = roster.slice(roster.indexOf('export function playgroundResidentLocation'), roster.indexOf('export function PlaygroundRoster')).replace('export ', '')
  const location = new Function('sectionAt', js(block) + '; return playgroundResidentLocation')(sectionAt)
  assert.equal(location({ position: [-8, -6], opacity: 1, arrivalTarget: null }), 'lounge')
  assert.equal(location({ position: [-4, 2], opacity: 1, arrivalTarget: null }), 'hall')
  assert.equal(location({ position: PLAYGROUND_EXIT, opacity: 0, arrivalTarget: [-8, -6] }), 'entrance')
})

test('startup stays covered until the hall, every model and the initial animations are ready', () => {
  const block = source.slice(source.indexOf('        if (!state.started &&'), source.indexOf('        const interactiveUi'))
  let shown = true
  const finish = new Function('state', 'simulation', 'setBooting', js(block))
  const sim = simulation(), state = { started: false, initialised: false, mapReady: false }
  finish(state, sim, (value: boolean) => { shown = value }); assert.equal(shown, true)
  state.initialised = true; sim.add(1, 'First', mapping); finish(state, sim, (value: boolean) => { shown = value }); assert.equal(shown, true)
  state.mapReady = true; finish(state, sim, (value: boolean) => { shown = value }); assert.equal(shown, true)
  const actor = sim.actors.get(1)!; actor.ready = true; actor.pending = true; finish(state, sim, (value: boolean) => { shown = value }); assert.equal(shown, true)
  actor.pending = false; finish(state, sim, (value: boolean) => { shown = value }); assert.equal(shown, false); assert.equal(state.started, true)
})

test('mobile frame pacing keeps its target on standard and high-refresh displays', () => {
  const block = source.slice(source.indexOf('      if (!document.hidden && time < nextFrameTime'), source.indexOf('      const workStarted'))
  const js = ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  for (const targetFps of [30, 60]) for (const refreshRate of [60, 90, 120, 144]) {
    const tick = new Function('targetFps', `
      const document = {hidden: false}, requestAnimationFrame = () => 0, render = () => {};
      let nextFrameTime = 0, frame = 0;
      return time => { ${js}; return true }
    `)(targetFps)
    let frames = 0
    for (let i = 0; i < refreshRate * 2; i++) if (tick(i * 1000 / refreshRate)) frames++
    assert.ok(Math.abs(frames - targetFps * 2) <= 1, `${targetFps} FPS stays paced on a ${refreshRate} Hz display: ${frames} frames`)
  }
})
