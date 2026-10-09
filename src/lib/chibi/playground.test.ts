import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyChibiProfile } from './types'
import { initialPlaygroundMapping, readPlaygroundMapping, type PlaygroundMapping } from './playground-mapping'
import { PlaygroundSimulation, playgroundPath, walkable, socialClear, STUDENT_SPACING, PLAYGROUND_CAPACITY, PLAYGROUND_EXIT, DEPARTURE_FADE_SECONDS, playgroundStudentName } from './playground-simulation'
import { OFFICE_SECTIONS, randomSectionTargets, sectionAt } from './playground-layout'

function mapping(): PlaygroundMapping {
  const value = initialPlaygroundMapping('source', emptyChibiProfile())
  for (const role of Object.keys(value.roles) as (keyof typeof value.roles)[]) value.roles[role] = [{ clip: role, loop: ['idle', 'walk', 'performance', 'watch', 'pickup'].includes(role) }]
  return value
}
const flush = async () => { await Promise.resolve(); await Promise.resolve() }
const advance = async (sim: PlaygroundSimulation, seconds: number) => { for (let i = 0; i < seconds * 20; i++) { sim.tick(0.05); await flush() } }
function setup(value = mapping(), random = () => 0.1) {
  const calls: { id: number; clip: string }[] = []
  const sim = new PlaygroundSimulation(async (id, clip) => { calls.push({ id, clip }); return true }, () => 2, random)
  sim.add(1, 'First', structuredClone(value)); sim.add(2, 'Second', structuredClone(value)); sim.ready(1); sim.ready(2)
  return { sim, calls }
}

test('only existing reviewed basic actions become initial roles; names never assign social semantics', () => {
  const profile = emptyChibiProfile()
  profile.interactions.walk = { state: 'available', clip: 'verified-walk' }
  profile.interactions.touch = { state: 'available', clip: 'verified-touch' }
  const value = initialPlaygroundMapping('source', profile)
  assert.equal(value.roles.walk[0].clip, 'verified-walk'); assert.equal(value.roles.reaction[0].clip, 'verified-touch')
  assert.deepEqual(value.roles.greeting, []); assert.deepEqual(value.roles.performance, [])
})

test('mapping rejects missing roles, unknown clips, duplicate clips and changed source identities', () => {
  const value = mapping(), clips = Object.keys(value.roles)
  assert.deepEqual(readPlaygroundMapping(value, 'source', clips), value)
  assert.throws(() => readPlaygroundMapping(value, 'different-source', clips))
  assert.throws(() => readPlaygroundMapping(value, 'source', ['idle']))
  value.roles.greeting.push(value.roles.greeting[0]); assert.throws(() => readPlaygroundMapping(value, 'source', clips))
  assert.throws(() => readPlaygroundMapping({ ...value, roles: {} }, 'source', clips))
})

test('newly imported Pickup is available automatically on the next catalog load', () => {
  const profile = emptyChibiProfile()
  assert.deepEqual(initialPlaygroundMapping('source', profile).roles.pickup, [])
  profile.interactions.pickup = { state: 'available', clip: 'new-pickup' }
  assert.deepEqual(initialPlaygroundMapping('source', profile).roles.pickup, [{ clip: 'new-pickup', loop: true }])
})

test('floor routing rejects scenery and bounds while removed prop locations stay clear', () => {
  for (const point of [[-7, -1], [1, 4], [0, 1]] as [number, number][]) assert.equal(walkable(point), true, 'removed prop footprint')
  assert.equal(playgroundPath([1, 0], [40, 0]), null)
  assert.equal(walkable([5.5, 11]), false, 'sealed elevator shaft')
  assert.equal(walkable([-13.5, -2]), false, 'atrium fountain')
  assert.equal(walkable([5.5, 0]), true)
  const path = playgroundPath([-8.5, -1], [-5.5, -1])!
  assert.ok(path.length >= 1); assert.ok(path.every(point => walkable(point)))
  assert.equal(walkable([20, -1]), false, 'treadmill is an obstacle')
  const exit = playgroundPath([1, -2.5], PLAYGROUND_EXIT)!
  assert.ok(exit?.length); assert.ok(exit.every(point => walkable(point)), 'office has a clear exit route')
})

test('smoothed doorway routes clear scenery between navigation samples', () => {
  let previous: [number, number] = [0.32997298129422814, -1.2913153926867897]
  const path = playgroundPath(previous, PLAYGROUND_EXIT)
  assert.ok(path)
  for (const next of path) {
    const steps = Math.ceil(Math.hypot(next[0] - previous[0], next[1] - previous[1]) / 0.005)
    for (let i = 1; i <= steps; i++) assert.ok(walkable([previous[0] + (next[0] - previous[0]) * i / steps, previous[1] + (next[1] - previous[1]) * i / steps]))
    previous = next
  }
})

test('automatic greetings coordinate two students, play both mapped clips and release participants', async () => {
  const { sim, calls } = setup(); await flush()
  await advance(sim, 12)
  assert.ok(calls.some(call => call.id === 1 && call.clip === 'greeting'))
  assert.ok(calls.some(call => call.id === 2 && call.clip === 'greeting'))
  // Stop new decisions, and let the current encounter finish.
  for (const actor of sim.actors.values()) actor.roam = false
  await advance(sim, 10); assert.equal(sim.encounters.size, 0)
  assert.ok([...sim.actors.values()].every(a => a.encounter === null))
})

test('each cafe reaction returns to idle independently while both students wait for the longer reaction', async () => {
  const value = mapping(); value.roles.greeting = []; value.roles.reaction = [{ clip: 'Cafe_Reaction', loop: false }]
  const calls: { id: number; clip: string }[] = []
  const sim = new PlaygroundSimulation(async (id, clip) => { calls.push({ id, clip }); return true }, (id, clip) => clip === 'Cafe_Reaction' ? id === 1 ? 3 : 27 : 1, () => 0.1)
  for (const id of [1, 2]) { sim.add(id, `Student ${id}`, structuredClone(value)); sim.ready(id); sim.actors.get(id)!.roam = false }
  await flush(); assert.equal(sim.greet(1, 2), true); await advance(sim, 0.1)
  for (const seconds of [8, 8, 10]) {
    await advance(sim, seconds)
    assert.equal(sim.encounters.size, 1)
    for (const id of [1, 2]) assert.equal(sim.actors.get(id)!.state, 'acting')
    assert.equal(calls.filter(call => call.id === 1).at(-1)!.clip, 'idle')
    assert.equal(calls.filter(call => call.id === 2).at(-1)!.clip, 'Cafe_Reaction')
  }
  await advance(sim, 1.1); assert.equal(sim.encounters.size, 0)
  assert.ok([...sim.actors.values()].every(actor => actor.state === 'idle'))
})

test('finishing a conversation preserves idle playback and position before roaming resumes', async () => {
  const value = mapping(); value.roles.greeting = []; value.roles.reaction = [{ clip: 'Cafe_Reaction', loop: false }]
  const calls: { id: number; clip: string }[] = [], finished = new Set<number>()
  const sim = new PlaygroundSimulation(async (id, clip) => { calls.push({ id, clip }); return true }, () => 1, () => 0.1, () => {}, id => finished.has(id))
  for (const id of [1, 2]) { sim.add(id, `Student ${id}`, structuredClone(value)); sim.ready(id); sim.actors.get(id)!.roam = false }
  await flush(); assert.equal(sim.greet(1, 2), true); await advance(sim, 6)
  assert.equal(sim.encounters.size, 1)
  finished.add(1); await advance(sim, 0.1)
  const firstIdleCalls = calls.filter(call => call.id === 1 && call.clip === 'idle').length
  await advance(sim, 1)
  const before = [...sim.actors.values()].map(actor => [...actor.position])
  for (const actor of sim.actors.values()) actor.roam = true
  const secondIdleCalls = calls.filter(call => call.id === 2 && call.clip === 'idle').length
  finished.add(2); await advance(sim, 0.15)
  assert.equal(sim.encounters.size, 0)
  assert.equal(calls.filter(call => call.id === 1 && call.clip === 'idle').length, firstIdleCalls, 'the early finisher keeps its idle phase')
  assert.equal(calls.filter(call => call.id === 2 && call.clip === 'idle').length, secondIdleCalls + 1, 'the last finisher starts idle only once')
  assert.deepEqual([...sim.actors.values()].map(actor => [...actor.position]), before)
  await advance(sim, 0.3)
  assert.deepEqual([...sim.actors.values()].map(actor => [...actor.position]), before, 'students settle briefly before their next walk')
  const walks = calls.filter(call => call.clip === 'walk').length
  await advance(sim, 6)
  assert.ok(calls.filter(call => call.clip === 'walk').length > walks, 'autonomous roaming continues after the pause')
})

test('a completed reaction switches to idle immediately and the encounter waits until both idle clips load', async () => {
  const value = mapping(); value.roles.greeting = []; value.roles.reaction = [{ clip: 'Cafe_Reaction', loop: false }]
  const calls: { id: number; clip: string }[] = [], finished = new Set<number>(), idleLoads = new Map<number, (played: boolean) => void>()
  let delayIdle = false
  const sim = new PlaygroundSimulation(async (id, clip) => {
    calls.push({ id, clip })
    return delayIdle && clip === 'idle' ? new Promise<boolean>(resolve => { idleLoads.set(id, resolve) }) : true
  }, () => 27, () => 0.1, () => {}, id => finished.has(id))
  for (const id of [1, 2]) { sim.add(id, `Student ${id}`, structuredClone(value)); sim.ready(id); sim.actors.get(id)!.roam = false }
  await flush(); assert.equal(sim.greet(1, 2), true); await advance(sim, 0.1); delayIdle = true
  finished.add(1); await advance(sim, 0.05)
  assert.equal(calls.filter(call => call.id === 1).at(-1)!.clip, 'idle')
  assert.equal(calls.filter(call => call.id === 2).at(-1)!.clip, 'Cafe_Reaction')
  const firstIdleCalls = calls.filter(call => call.id === 1 && call.clip === 'idle').length
  await advance(sim, 8)
  assert.equal(sim.encounters.size, 1); assert.equal(calls.filter(call => call.id === 1 && call.clip === 'idle').length, firstIdleCalls)
  finished.add(2); await advance(sim, 0.05)
  assert.equal(calls.filter(call => call.id === 2).at(-1)!.clip, 'idle')
  assert.equal(sim.encounters.size, 1); assert.equal(sim.actors.get(2)!.pending, true)
  idleLoads.get(1)!(true); await flush()
  await advance(sim, 8); assert.equal(sim.encounters.size, 1)
  delayIdle = false; idleLoads.get(2)!(true); await flush(); await advance(sim, 0.1)
  assert.equal(sim.encounters.size, 0); assert.ok([...sim.actors.values()].every(actor => actor.state === 'idle' && !actor.pending))
})

test('a direct cafe reaction waits for lazy loading and plays beyond fifteen seconds', async () => {
  const value = mapping(); value.roles.reaction = [{ clip: 'Cafe_Reaction', loop: false }]
  let loaded!: (played: boolean) => void
  const sim = new PlaygroundSimulation(async (_id, clip) => clip === 'Cafe_Reaction' ? new Promise<boolean>(resolve => { loaded = resolve }) : true, () => 27, () => 0.1)
  sim.add(1, 'Student', value); sim.ready(1); sim.actors.get(1)!.roam = false; await flush()
  assert.equal(sim.react(1), true); await advance(sim, 12)
  assert.equal(sim.actors.get(1)!.state, 'acting'); assert.equal(sim.actors.get(1)!.remaining, 27)
  loaded(true); await flush(); await advance(sim, 26)
  assert.equal(sim.actors.get(1)!.state, 'acting')
  await advance(sim, 1.1); assert.equal(sim.actors.get(1)!.state, 'idle')
})

test('elapsed conversation timers wait for actual one-shot playback before returning each student to idle', async () => {
  const value = mapping(); value.roles.greeting = []; value.roles.reaction = [{ clip: 'Cafe_Reaction', loop: false }]
  const finished = new Set<number>()
  const sim = new PlaygroundSimulation(async () => true, () => 2, () => 0.1, () => {}, id => finished.has(id))
  for (const id of [1, 2]) { sim.add(id, `Student ${id}`, structuredClone(value)); sim.ready(id); sim.actors.get(id)!.roam = false }
  await flush(); sim.greet(1, 2); await advance(sim, 8)
  assert.equal(sim.encounters.size, 1)
  finished.add(1); await advance(sim, 1); assert.equal(sim.encounters.size, 1)
  finished.add(2); await advance(sim, 0.1); assert.equal(sim.encounters.size, 0)
  assert.equal(sim.react(1), true); finished.delete(1); await flush(); await advance(sim, 3)
  assert.equal(sim.actors.get(1)!.state, 'acting')
  finished.add(1); await advance(sim, 0.1); assert.equal(sim.actors.get(1)!.state, 'idle')
})

test('a direct movement command interrupts an encounter and frees its other participant', async () => {
  const { sim } = setup(); await flush(); assert.equal(sim.greet(1, 2), true)
  assert.equal(sim.encounters.size, 1); assert.equal(sim.move(1, [-8, -4]), true)
  assert.equal(sim.encounters.size, 0); assert.equal(sim.actors.get(2)!.encounter, null)
  assert.equal(sim.actors.get(1)!.state, 'walking')
})

test('a greeting initiated by the student on the right does not swap slots and deadlock the pair', async () => {
  const { sim, calls } = setup(); await flush(); sim.roam(1, false); sim.roam(2, false)
  assert.equal(sim.greet(2, 1), true); await advance(sim, 8)
  assert.equal(sim.encounters.size, 0); assert.ok(calls.some(call => call.id === 2 && call.clip === 'greeting'))
})

test('a floor command can move away from a nearby student without snapping into them first', async () => {
  const { sim } = setup(); await flush(); sim.roam(1, false); sim.roam(2, false)
  sim.actors.get(1)!.position = [-5.09136, 0.01017]
  sim.actors.get(2)!.position = [-4.49769, 0.09840]
  assert.equal(sim.move(2, [-2, 0.5]), true); await advance(sim, 3)
  assert.ok(sim.actors.get(2)!.position[0] > -3.5)
})

test('stay-here and pause stop autonomous motion', async () => {
  const value = mapping(); value.roles.greeting = []; value.roles.performance = []; value.roles.toy = []
  const { sim, calls } = setup(value); await flush()
  sim.roam(1, false); sim.roam(2, false); const positions = [...sim.actors.values()].map(a => [...a.position])
  await advance(sim, 15); assert.deepEqual([...sim.actors.values()].map(a => a.position), positions)
  assert.equal(sim.move(1, [-8, -4]), true); sim.paused = true; await advance(sim, 5)
  assert.deepEqual(sim.actors.get(1)!.position, positions[0]); assert.ok(!calls.some(call => call.clip === 'greeting'))
})

test('population is capped, and stale animation failures cannot cancel a newer command', async () => {
  const resolvers: ((value: boolean) => void)[] = []
  const sim = new PlaygroundSimulation(() => new Promise(resolve => resolvers.push(resolve)), () => 2)
  sim.add(1, 'First', mapping()); sim.ready(1)
  for (let id = 2; id <= PLAYGROUND_CAPACITY; id++) assert.equal(sim.add(id, `Student ${id}`, mapping()), true)
  assert.equal(PLAYGROUND_CAPACITY, 21); assert.equal(sim.add(22, 'Twenty second', mapping()), false)
  for (const section of OFFICE_SECTIONS) assert.equal(sim.sectionPopulation(section.id), 3)
  sim.react(1); const latest = sim.actors.get(1)!.generation
  resolvers[0](false); await flush(); assert.equal(sim.actors.get(1)!.generation, latest); assert.equal(sim.actors.get(1)!.state, 'acting')
})

test('new invitations use a clear spawn after a resident is removed', async () => {
  const { sim } = setup(); sim.add(3, 'Third', mapping()); sim.remove(1); sim.add(4, 'Fourth', mapping())
  const points = [...sim.actors.values()].map(actor => actor.position)
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) assert.ok(Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]) >= 0.9)
})

test('animation failure releases an encounter and reports an error on the failed student', async () => {
  const sim = new PlaygroundSimulation(async (_id, clip) => clip !== 'greeting', () => 1, () => 0.1)
  sim.add(1, 'First', mapping()); sim.add(2, 'Second', mapping()); sim.ready(1); sim.ready(2); await flush()
  for (const actor of sim.actors.values()) actor.roam = false
  sim.greet(1, 2); await advance(sim, 8)
  assert.equal(sim.encounters.size, 0); assert.ok([...sim.actors.values()].some(a => a.state === 'error'))
  assert.ok([...sim.actors.values()].every(actor => actor.oneShot === null))
})

test('a failed idle animation stops cleanly instead of retrying itself indefinitely', async () => {
  let calls = 0
  const sim = new PlaygroundSimulation(async () => { calls++; return false }, () => 1)
  sim.add(1, 'First', mapping()); sim.ready(1); await flush(); await advance(sim, 10)
  assert.equal(calls, 1); assert.equal(sim.actors.get(1)!.state, 'error')
})

test('basic reviewed roles produce autonomous conversations without assigning a greeting clip', async () => {
  const value = mapping(); value.roles.greeting = []; value.roles.performance = []; value.roles.watch = []; value.roles.toy = []
  const { sim, calls } = setup(value); await flush(); await advance(sim, 6)
  assert.equal(sim.encounters.size, 1)
  assert.ok([...sim.actors.values()].every(a => a.state === 'acting' && a.label.startsWith('Chatting with') && a.social))
  assert.ok(calls.some(call => call.clip === 'reaction'))
  assert.ok(!calls.some(call => call.clip === 'greeting'))
  assert.deepEqual(value.roles.greeting, [])
  const speaking = sim.actors.get(1)!.speaking
  assert.notEqual(speaking, sim.actors.get(2)!.speaking)
  await advance(sim, 1.6); assert.notEqual(sim.actors.get(1)!.speaking, speaking); assert.equal(sim.actors.get(2)!.speaking, speaking)
})

test('a moving obstruction stops the walk animation, then the route resumes when clear', async () => {
  const { sim, calls } = setup(); await flush(); sim.roam(1, false); sim.roam(2, false)
  sim.actors.get(1)!.position = [-6, 0]
  sim.actors.get(2)!.position = [-1, 3]
  assert.equal(sim.move(1, [-3, 0]), true); await flush()
  sim.actors.get(2)!.position = [-4.85, 0]
  const before = [...sim.actors.get(1)!.position]
  await advance(sim, 0.1)
  assert.equal(sim.actors.get(1)!.state, 'yielding')
  assert.deepEqual(sim.actors.get(1)!.position, before)
  assert.equal(calls.filter(call => call.id === 1).at(-1)!.clip, 'idle')
  sim.actors.get(2)!.position = [-1, 3]; await advance(sim, 5)
  assert.equal(sim.actors.get(1)!.state, 'idle')
  assert.ok(Math.hypot(sim.actors.get(1)!.position[0] + 3, sim.actors.get(1)!.position[1]) < 0.04)
})

test('carrying releases a partner, rejects occupied drops, and returns to idle', async () => {
  const { sim } = setup(); await flush(); sim.greet(1, 2)
  assert.equal(sim.beginDrag(1), true); assert.equal(sim.encounters.size, 0)
  assert.equal(sim.drag(1, sim.actors.get(2)!.position), false)
  assert.equal(sim.drag(1, [-13.5, -2]), false)
  assert.equal(sim.drag(1, [40, 0]), false)
  assert.equal(sim.drag(1, [-3, 0]), true)
  await advance(sim, 3); assert.equal(sim.actors.get(1)!.state, 'dragging')
  sim.endDrag(1); assert.equal(sim.actors.get(1)!.state, 'idle'); assert.ok(sim.actors.get(1)!.cooldown >= 12)
})

test('visitor replacement waits for age and protects selected, staying, and busy students', async () => {
  const { sim } = setup(); await flush()
  assert.equal(sim.replacement(), null)
  for (const actor of sim.actors.values()) actor.age = 46
  assert.equal(sim.replacement([1]), 2)
  sim.roam(2, false); assert.equal(sim.replacement([1]), null)
  sim.beginDrag(1); assert.equal(sim.replacement(), null)
  sim.endDrag(1); assert.equal(sim.replacement(), null); await flush()
  assert.equal(sim.replacement(), 1)
  sim.paused = true; await advance(sim, 5); assert.equal(sim.actors.get(1)!.age, 46)
})

test('21 autonomous students keep clear footprints through varied encounters and unrestricted room routes', async () => {
  for (let seed = 1; seed <= 6; seed++) {
    let state = seed
    const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296 }
    const social = new Set<number>()
    const sim = new PlaygroundSimulation(async (id, clip) => { if (clip === 'greeting') social.add(id); return true }, () => 2, random)
    for (let id = 1; id <= PLAYGROUND_CAPACITY; id++) { sim.add(id, `Student ${id}`, mapping()); sim.ready(id) }
    const initialGroups = OFFICE_SECTIONS.map(section => ({ id: section.id, students: [...sim.actors.values()].filter(actor => actor.sectionId === section.id).map(actor => actor.id) }))
    for (let frame = 0; frame < 3200; frame++) {
      sim.tick(0.05); await flush()
      const actors = [...sim.actors.values()]
      assert.equal(sim.actors.size, PLAYGROUND_CAPACITY)
      for (let i = 0; i < actors.length; i++) {
        assert.ok(walkable(actors[i].position, actors[i].radius), `scenery collision at seed ${seed}, frame ${frame}`)
        for (let j = i + 1; j < actors.length; j++) assert.ok(Math.hypot(actors[i].position[0] - actors[j].position[0], actors[i].position[1] - actors[j].position[1]) >= STUDENT_SPACING - 0.002, `student collision at seed ${seed}, frame ${frame}`)
      }
      for (const encounter of sim.encounters.values()) if (encounter.phase === 'playing') assert.ok(socialClear(sim.actors.get(encounter.actors[0])!.position, sim.actors.get(encounter.actors[1])!.position), `blocked conversation at seed ${seed}, frame ${frame}`)
    }
    for (const group of initialGroups) assert.ok(group.students.some(id => social.has(id)), `${group.id} residents should have autonomous conversations at seed ${seed}`)
  }
})

test('reloading or failing a model releases reservations before visitor removal', async () => {
  const { sim } = setup(); await flush(); sim.greet(1, 2); await advance(sim, 1)
  sim.ready(1); await flush()
  assert.equal(sim.encounters.size, 0); assert.equal(sim.actors.get(2)!.encounter, null)
  sim.greet(1, 2); sim.fail(1, 'Model failed')
  assert.equal(sim.encounters.size, 0); assert.equal(sim.actors.get(1)!.state, 'error')
  sim.remove(1); await advance(sim, 12); assert.equal(sim.actors.size, 1)
})

test('moving to the current spot stays idle instead of waiting forever', async () => {
  const { sim } = setup(); await flush()
  assert.equal(sim.move(1, sim.actors.get(1)!.position), true)
  assert.equal(sim.actors.get(1)!.state, 'idle')
})

test('automatic conversation includes the third visitor instead of always choosing the same pair', async () => {
  // Keep this fairness fixture in its room; hallway roaming has separate coverage.
  const { sim, calls } = setup(mapping(), () => 0.5); sim.add(3, 'Third', mapping()); sim.ready(3)
  // Nearby starting positions keep social fairness independent of floor-grid ordering.
  const starts: [number, number][] = [[-8, -5], [-6.3, -5], [-7, -3.5]]
  for (const [i, actor] of [...sim.actors.values()].entries()) { assert.ok(walkable(starts[i])); actor.position = starts[i] }
  // Include the walks and social cooldowns between encounters.
  await advance(sim, 120)
  for (const id of [1, 2, 3]) assert.ok(calls.some(call => call.id === id && call.clip === 'greeting'), `student ${id} should meet a friend`)
})

test('the roster rejects other variants during loading, residence, and departure', async () => {
  const sim = new PlaygroundSimulation(async () => true, () => 1)
  assert.equal(sim.add(1, 'Akane (School)', mapping()), true)
  assert.equal(sim.add(2, 'Akane', mapping()), false)
  assert.equal(sim.add(3, 'Akane (Bunny)', mapping()), false)
  assert.equal(sim.add(4, 'Koharu (Swimsuit)', mapping()), true)
  sim.ready(1); await flush(); assert.equal(sim.depart(1), true)
  assert.equal(sim.add(2, 'Akane', mapping()), false)
  await advance(sim, 45); assert.equal(sim.actors.has(1), false)
  assert.equal(sim.add(2, 'Akane', mapping()), true)
  assert.equal(playgroundStudentName('Shiroko*Terror'), 'Shiroko')
})

test('greetings use the base name of a variant', async () => {
  const sim = new PlaygroundSimulation(async () => true, () => 1)
  sim.add(1, 'Akane (School)', mapping()); sim.add(2, 'Koharu (Swimsuit)', mapping())
  sim.ready(1); sim.ready(2); await flush(); sim.roam(1, false); sim.roam(2, false); await flush()
  assert.equal(sim.greet(1, 2), true); await advance(sim, 0.2)
  assert.equal(sim.actors.get(1)!.social, 'chat'); assert.equal(sim.actors.get(1)!.label, 'Chatting with Koharu')
  assert.equal(sim.actors.get(2)!.label, 'Chatting with Akane')
})

test('unloaded students cannot talk, move, or take part in encounters', async () => {
  const { sim } = setup(); sim.add(3, 'Not loaded', mapping()); await flush()
  assert.equal(sim.greet(1, 3), false); assert.equal(sim.move(3, [5, 0]), false)
  await advance(sim, 20)
  assert.equal(sim.actors.get(3)!.state, 'loading'); assert.equal(sim.actors.get(3)!.social, null)
  assert.equal(sim.actors.get(3)!.age, 0)
})

test('departing students walk to the exit, fade there, and hold their slot until the fade ends', async () => {
  const sim = new PlaygroundSimulation(async () => true, () => 1, () => 0.5)
  for (let id = 1; id <= PLAYGROUND_CAPACITY; id++) { sim.add(id, `Student ${id}`, mapping()); sim.ready(id); sim.roam(id, false) }
  await flush(); assert.equal(sim.depart(1), true)
  const start = [...sim.actors.get(1)!.position]
  assert.equal(sim.move(1, [0, 2]), false); assert.equal(sim.greet(1, 2), false); assert.equal(sim.beginDrag(1), false)
  await advance(sim, 0.5)
  assert.notDeepEqual(sim.actors.get(1)!.position, start); assert.equal(sim.actors.get(1)!.opacity, 1)
  assert.equal(sim.add(22, 'New visitor', mapping()), false)
  for (let i = 0; i < 1400 && sim.actors.get(1)!.state !== 'fading'; i++) { sim.tick(0.05); await flush() }
  const actor = sim.actors.get(1)!
  assert.equal(actor.state, 'fading'); assert.ok(Math.hypot(actor.position[0] - PLAYGROUND_EXIT[0], actor.position[1] - PLAYGROUND_EXIT[1]) < 0.04)
  await advance(sim, DEPARTURE_FADE_SECONDS / 2)
  assert.ok(actor.opacity > 0 && actor.opacity < 1); assert.equal(sim.actors.size, PLAYGROUND_CAPACITY)
  sim.paused = true; const opacity = actor.opacity; await advance(sim, 5); assert.equal(actor.opacity, opacity)
  sim.paused = false; await advance(sim, DEPARTURE_FADE_SECONDS)
  assert.equal(sim.actors.has(1), false); assert.equal(sim.add(22, 'New visitor', mapping()), true)
  assert.equal(sim.actors.get(22)!.ready, false); assert.equal(sim.actors.get(22)!.social, null)
})

test('a departure waits and reroutes around a blocked exit instead of disappearing on a timer', async () => {
  const { sim } = setup(); await flush(); sim.roam(1, false); sim.roam(2, false); await flush()
  sim.actors.get(2)!.position = [...PLAYGROUND_EXIT]
  assert.equal(sim.depart(1), true); await advance(sim, 35)
  assert.equal(sim.actors.has(1), true); assert.equal(sim.actors.get(1)!.opacity, 1)
  assert.equal(sim.actors.get(1)!.state, 'yielding')
  sim.actors.get(2)!.position = [0, 1]
  await advance(sim, 50); assert.equal(sim.actors.has(1), false)
})

test('idle roaming students make room for a departure through the changing-room doorway', async () => {
  const sim = new PlaygroundSimulation(async () => true, () => 1, () => 0.5)
  for (let id = 1; id <= 3; id++) { assert.equal(sim.add(id, `Student ${id}`, mapping(), 'office'), true); sim.ready(id); sim.actors.get(id)!.cooldown = 1000 }
  sim.actors.get(1)!.position = [1.125, -1.75]
  sim.actors.get(2)!.position = [3.25, -3]
  sim.actors.get(3)!.position = [1.125, -3.75]
  await flush(); const before = [...sim.actors.get(1)!.position]
  assert.equal(sim.depart(3), true); await advance(sim, 60)
  assert.equal(sim.actors.has(3), false, 'the rear visitor must reach the exit and finish fading')
  assert.notDeepEqual(sim.actors.get(1)!.position, before, 'the roaming doorway blocker should step aside')
  assert.ok([...sim.actors.values()].every(actor => walkable(actor.position)))
})

test('a failed departure animation keeps the model and slot, then retries the exit walk', async () => {
  let loaded = false
  const sim = new PlaygroundSimulation(async (_id, clip) => clip !== 'walk' || loaded, () => 1)
  sim.add(1, 'Akane (School)', mapping()); sim.ready(1); await flush(); sim.depart(1); await flush()
  assert.equal(sim.actors.get(1)!.state, 'yielding'); assert.equal(sim.actors.get(1)!.ready, true)
  assert.equal(sim.add(2, 'Akane', mapping()), false)
  loaded = true; await advance(sim, 45); assert.equal(sim.actors.has(1), false)
})

test('random section targets contain one, two and three students and evolve only in active time', async () => {
  const targets = randomSectionTargets(() => 0.1)
  assert.equal(targets.size, 7); assert.deepEqual([...new Set(targets.values())].sort(), [1, 2, 3])
  const sim = new PlaygroundSimulation(async () => true, () => 1, () => 0.1)
  const before = [...sim.sectionTargets]
  sim.paused = true; await advance(sim, 60); assert.deepEqual([...sim.sectionTargets], before)
  sim.paused = false; await advance(sim, 40); assert.notDeepEqual([...sim.sectionTargets], before)
  assert.ok([...sim.sectionTargets.values()].every(count => count >= 1 && count <= 3))
})

test('room populations do not block walking, carrying, conversations or additional invitations', async () => {
  const sim = new PlaygroundSimulation(async () => true, () => 1)
  for (let id = 1; id <= 3; id++) assert.equal(sim.add(id, `Student ${id}`, mapping(), 'lounge'), true)
  sim.actors.get(1)!.position = [-8, -5]
  sim.actors.get(2)!.position = [0, 1]; sim.actors.get(3)!.position = [4, 1]
  const destination: [number, number] = [-6.3, -5]
  sim.add(4, 'Fourth', mapping(), 'games'); sim.ready(4); await flush()
  assert.equal(sim.move(4, destination), true)
  sim.beginDrag(4); assert.equal(sim.drag(4, destination), true); sim.endDrag(4)
  assert.equal(sim.sectionPopulation('lounge'), 4)
  assert.equal(sim.invite(5, 'Fifth', mapping(), 'lounge'), true)
  sim.ready(1); await flush()
  sim.actors.get(1)!.position = [-8, -5]
  sim.actors.get(2)!.position = [0, 1]; sim.actors.get(3)!.position = [4, 1]
  assert.equal(sim.greet(1, 4), true, 'a nearby conversation must not be rejected by the room count')
  assert.equal(sim.encounters.size, 1)
  sim.cancel(1); await flush()
  sim.actors.get(4)!.roam = false
  for (let i = 0; i < 50; i++) { sim.tick(0.05); await flush() }
  assert.equal(sim.move(4, [-5, -5]), true)
  await advance(sim, 4)
  assert.ok(Math.hypot(sim.actors.get(4)!.position[0] + 5, sim.actors.get(4)!.position[1] + 5) < 0.05, 'autonomous route stepping also ignores room counts')
  assert.equal(sim.surplusVisitor(), null, 'a crowded room alone must not send visitors home')
})

test('visitor refills and surplus departures follow the hall total instead of individual room counts', async () => {
  const sim = new PlaygroundSimulation(async () => true, () => 1)
  for (const section of OFFICE_SECTIONS) sim.sectionTargets.set(section.id, 1)
  for (let id = 1; id <= 7; id++) { assert.equal(sim.add(id, `Student ${id}`, mapping(), id <= 3 ? 'lounge' : 'cafe'), true); sim.ready(id) }
  await flush()
  assert.equal(sim.vacantSection(), null, 'empty rooms must not add visitors when the hall target is met')
  assert.equal(sim.surplusVisitor(), null, 'busy rooms must not send visitors home when the hall target is met')
  sim.sectionTargets.set('meeting', 2)
  assert.notEqual(sim.vacantSection(), null)
  assert.equal(sim.add(8, 'Eighth', mapping(), 'meeting'), true); sim.ready(8); await flush()
  sim.sectionTargets.set('meeting', 1)
  const surplus = sim.surplusVisitor([1, 2, 3, 4, 5, 6, 7])
  assert.equal(surplus, 8, 'only an eligible unprotected visitor is chosen when the hall total is too high')
})

test('every supplied office room fits three initial residents and has a clear exit route', () => {
  const sim = new PlaygroundSimulation(async () => true, () => 1)
  let id = 1
  for (const section of OFFICE_SECTIONS) {
    for (let i = 0; i < 3; i++) { assert.equal(sim.add(id, `Student ${id}`, mapping(), section.id), true); id++ }
    for (const actor of sim.actors.values()) if (actor.sectionId === section.id) {
      assert.equal(sectionAt(actor.position)?.id, section.id)
      const route = playgroundPath(actor.position, PLAYGROUND_EXIT)
      assert.ok(route?.length, `${section.name} resident at ${actor.position} must be able to leave`)
      assert.ok(route.every(point => walkable(point)))
    }
  }
  assert.equal(sim.actors.size, 21)
})

test('nearby friends across a solid room wall never begin a conversation', async () => {
  const { sim } = setup(); await flush(); sim.roam(1, false); sim.roam(2, false)
  sim.actors.get(1)!.position = [-4.75, 7.75]
  sim.actors.get(2)!.position = [-7.5, 6.75]
  assert.ok(walkable(sim.actors.get(1)!.position)); assert.ok(walkable(sim.actors.get(2)!.position))
  const accepted = sim.greet(1, 2); await advance(sim, 1)
  assert.ok(!accepted || [...sim.actors.values()].every(a => a.state !== 'acting'), 'blocked partners must meet on clear floor before talking')
})

test('two autonomous friends take walks between conversations instead of staying in the same spots', async () => {
  const { sim } = setup(); await flush()
  const starts = [...sim.actors.values()].map(a => [...a.position])
  await advance(sim, 60)
  assert.ok([...sim.actors.values()].every((a, i) => Math.hypot(a.position[0] - starts[i][0], a.position[1] - starts[i][1]) > 0.5))
})

test('hallway visitors automatically meet even with different home rooms', async () => {
  const { sim } = setup(); await flush()
  sim.actors.get(1)!.position = [-4, 2]
  sim.actors.get(2)!.position = [-2, 2]; sim.actors.get(2)!.sectionId = 'games'
  await advance(sim, 6)
  assert.ok([...sim.actors.values()].every(a => a.state === 'acting' && a.social === 'chat'))
})

test('walking turns gradually and takes the short turn across the angle wrap', async () => {
  const { sim } = setup(); await flush(); sim.roam(1, false); sim.roam(2, false)
  const actor = sim.actors.get(1)!; actor.position = [-4, 2]; actor.angle = 0
  assert.equal(sim.move(1, [-2, 2]), true); await flush(); sim.tick(0.05)
  assert.ok(actor.angle > 0 && actor.angle <= 0.21, 'a ninety-degree turn must not happen in one tick')
  actor.angle = Math.PI - 0.05; actor.path = [[-4.2, 0]]; sim.tick(0.05)
  assert.ok(Math.abs(Math.atan2(Math.sin(actor.angle - Math.PI), Math.cos(actor.angle - Math.PI))) < 0.3)
})

test('a larger body footprint rejects wall-side destinations, drops and obstructed shortcuts', async () => {
  const { sim } = setup(); await flush(); sim.roam(1, false); sim.roam(2, false)
  const target: [number, number] = [-4.75, 7.75]
  assert.equal(walkable(target), true)
  assert.equal(walkable(target, 0.55), false)
  const actor = sim.actors.get(1)!; actor.radius = 0.55
  assert.equal(sim.move(1, target), false); sim.beginDrag(1); assert.equal(sim.drag(1, target), false); sim.endDrag(1)
  const path = playgroundPath([-8.5, -1], [-5.5, -1], [], 0.55)!
  let previous: [number, number] = [-8.5, -1]
  for (const point of path) {
    for (let i = 1; i <= 100; i++) assert.ok(walkable([previous[0] + (point[0] - previous[0]) * i / 100, previous[1] + (point[1] - previous[1]) * i / 100], 0.55))
    previous = point
  }
})

test('unshrunk large students keep enough separation when spawning, carrying and walking', async () => {
  const { sim } = setup(); await flush()
  sim.ready(1, 0.9); sim.ready(2, 0.9); await flush()
  const first = sim.actors.get(1)!, second = sim.actors.get(2)!
  assert.equal(first.ready, true); assert.equal(second.ready, true)
  assert.ok(Math.hypot(first.position[0] - second.position[0], first.position[1] - second.position[1]) >= 1.8)
  first.position = [-3, 1]; second.position = [-1.7, 1]
  assert.equal(walkable(first.position, 0.9), true); assert.equal(walkable(second.position, 0.9), true)
  sim.beginDrag(1)
  assert.equal(sim.drag(1, [-3, 1]), false, 'old fixed spacing would allow their bodies to overlap')
  assert.equal(sim.drag(1, [-4, 1]), true); sim.endDrag(1); await flush()
  sim.roam(1, false); sim.roam(2, false)
  assert.equal(sim.move(1, [-0.5, 1]), true)
  await advance(sim, 5)
  assert.ok(Math.hypot(first.position[0] - second.position[0], first.position[1] - second.position[1]) >= 1.8 - 0.002)
})

test('large students can meet with a conversation gap that fits both bodies', async () => {
  const { sim } = setup(); await flush(); sim.ready(1, 0.9); sim.ready(2, 0.9); await flush()
  const first = sim.actors.get(1)!, second = sim.actors.get(2)!
  first.position = [-4, 1]; second.position = [1, 1]; sim.roam(1, false); sim.roam(2, false); await flush()
  assert.equal(sim.greet(1, 2), true)
  const goals = [first.path.at(-1) ?? first.position, second.path.at(-1) ?? second.position]
  assert.ok(Math.hypot(goals[0][0] - goals[1][0], goals[0][1] - goals[1][1]) >= 2)
  await advance(sim, 6)
  assert.equal(first.social, 'chat'); assert.equal(second.social, 'chat')
  assert.ok(Math.hypot(first.position[0] - second.position[0], first.position[1] - second.position[1]) >= 1.8)
})

