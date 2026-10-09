import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyChibiProfile } from './types'
import { initialPlaygroundMapping } from './playground-mapping'
import { PlaygroundSimulation, cameraWalkDirection, walkable, socialClear, type Point } from './playground-simulation'

const flush = async () => { await Promise.resolve(); await Promise.resolve() }
function setup(play = async (_id: number, _clip: string) => true) {
  const profile = emptyChibiProfile()
  for (const action of ['idle', 'walk', 'touch'] as const) profile.interactions[action] = { state: 'available', clip: action }
  const mapping = initialPlaygroundMapping('source', profile)
  const sim = new PlaygroundSimulation(play, () => 1, () => 0.5)
  sim.add(1, 'First', mapping); sim.ready(1)
  const actor = sim.actors.get(1)!; actor.position = [0, 1]; actor.sectionId = 'office'
  return { sim, actor, mapping }
}
async function walk(sim: PlaygroundSimulation, direction: Point, frames = 20) {
  for (let i = 0; i < frames; i++) { sim.tick(0.05); sim.steer(direction, 0.05); await flush() }
}

test('walking directions follow camera orbit instead of the student heading', () => {
  assert.deepEqual(cameraWalkDirection([0, 1], [0, 10]), [0, -1])
  assert.deepEqual(cameraWalkDirection([1, 0], [10, 0]), [0, -1])
  assert.deepEqual(cameraWalkDirection([0, 1], [10, 0]), [-1, -0])
})

test('control prevents autonomous movement, walks and turns smoothly, and restores previous roaming', async () => {
  const { sim, actor } = setup(); await flush()
  assert.equal(sim.control(1), true); await flush()
  await walk(sim, [0, 0], 160)
  assert.deepEqual(actor.position, [0, 1]); assert.equal(actor.state, 'controlled'); assert.equal(actor.roam, false)
  sim.steer([1, 0], 0.05); await flush(); sim.steer([1, 0], 0.05)
  assert.ok(actor.angle > 0 && actor.angle <= 0.2); assert.ok(actor.position[0] > 0)
  await walk(sim, [1, 1]); assert.ok(walkable(actor.position, actor.radius))
  sim.releaseControl(); assert.equal(actor.roam, true); assert.equal(actor.state, 'idle')
  await flush(); sim.roam(1, false); await flush(); sim.control(1); await flush(); sim.releaseControl()
  assert.equal(actor.roam, false, 'Stay here must survive camera mode')
})

test('direct walking waits for lazy Walk loading and respects pause', async () => {
  let resolve: (value: boolean) => void = () => {}
  const { sim, actor } = setup(async (_id, clip) => clip === 'walk' ? new Promise<boolean>(done => { resolve = done }) : true)
  await flush(); sim.control(1); await flush(); await walk(sim, [1, 0])
  assert.deepEqual(actor.position, [0, 1]); assert.equal(actor.pending, true)
  resolve(true); await flush(); await walk(sim, [1, 0]); assert.ok(actor.position[0] > 0)
  const before = [...actor.position]; sim.paused = true; await walk(sim, [1, 0])
  assert.deepEqual(actor.position, before)
})

test('direct walking cannot tunnel through furniture, walls or another student', async () => {
  const { sim, actor, mapping } = setup(); await flush(); sim.control(1); await flush()
  actor.position = [-13.5, 1]; assert.ok(walkable(actor.position, actor.radius))
  for (let i = 0; i < 100; i++) { await walk(sim, [0, -1], 1); assert.ok(walkable(actor.position, actor.radius), 'fountain clearance') }
  actor.position = [0, 1]; sim.add(2, 'Second', mapping); sim.ready(2); await flush()
  const other = sim.actors.get(2)!; other.position = [2, 1]; other.roam = false
  await walk(sim, [1, 0], 100)
  assert.ok(actor.position[0] < other.position[0], 'head-on input cannot walk through the other student core')
  assert.ok(Math.hypot(actor.position[0] - other.position[0], actor.position[1] - other.position[1]) >= 0.5)
  const before = [...actor.position]; sim.steer([1, 0], 10)
  assert.ok(Math.hypot(actor.position[0] - before[0], actor.position[1] - before[1]) <= 0.058, 'frame time is bounded')
})

test('a controlled student can pass between two wide students in a three-student room', async () => {
  const { sim, actor, mapping } = setup(); await flush()
  for (const id of [2, 3]) { sim.add(id, `Resident ${id}`, mapping, 'lounge'); sim.ready(id) }
  await flush()
  actor.position = [-8, -5]; actor.sectionId = 'lounge'; actor.radius = 0.65
  const others = [sim.actors.get(2)!, sim.actors.get(3)!]
  others.forEach((other, i) => { other.position = [-6.3, -5.6 + i * 1.2]; other.radius = 0.65; other.roam = false })
  sim.control(1); await flush()
  for (let i = 0; i < 55; i++) {
    await walk(sim, [1, 0], 1)
    assert.ok(walkable(actor.position, actor.radius))
    assert.ok(others.every(other => Math.hypot(actor.position[0] - other.position[0], actor.position[1] - other.position[1]) >= 0.5))
  }
  assert.ok(actor.position[0] > -5, 'hair and equipment overlap must not seal the gap between students')
  assert.equal(sim.sectionPopulation('lounge'), 3)
})

test('direct control can escape an existing student overlap but cannot move deeper into it', async () => {
  const { sim, actor, mapping } = setup(); sim.add(2, 'Second', mapping); sim.ready(2); await flush()
  const other = sim.actors.get(2)!; other.position = [0.3, 1]; other.roam = false
  sim.control(1); await flush(); await walk(sim, [1, 0], 10)
  assert.deepEqual(actor.position, [0, 1], 'movement into the other student core remains blocked')
  await walk(sim, [-1, 0], 15)
  assert.ok(actor.position[0] < -0.7, 'an overlapping actor must be able to walk away')
})

test('cardinal input slides along diagonal walls in both directions without clipping scenery', async () => {
  for (const [offset, direction] of [[-3, [1, 0]], [2, [0, -1]]] as [number, Point][]) {
    const { sim, actor } = setup(); await flush(); sim.control(1); await flush()
    actor.radius = 0.65
    const center: Point = [15.11856, 0.14265], q = Math.SQRT1_2
    const start: Point = [center[0] + q * offset - q * 0.95, center[1] + q * offset + q * 0.95]
    actor.position = [...start]; assert.ok(walkable(start, actor.radius))
    for (let i = 0; i < 60; i++) {
      const angle = actor.angle
      await walk(sim, direction, 1)
      assert.ok(walkable(actor.position, actor.radius), 'every sliding step stays outside the solid wall')
      assert.ok(Math.abs(actor.angle - angle) <= 0.200001, 'heading stays smooth while the wall redirects movement')
    }
    const tangentTravel = (actor.position[0] - start[0] + actor.position[1] - start[1]) * q
    assert.ok(Math.abs(tangentTravel) > 1.4, `continue along the wall instead of sticking, got ${tangentTravel}`)
    assert.ok(direction[0] ? actor.position[1] - start[1] > 0.35 : start[0] - actor.position[0] > 0.35, 'the wall assists the movement component missing from cardinal input')
  }
})

test('a small input tilt glides along a straight wall, while head-on input stops', async () => {
  const { sim, actor } = setup(); await flush(); sim.control(1); await flush()
  actor.radius = 0.65; actor.position = [3, -0.7]
  await walk(sim, [0, -1], 40)
  assert.ok(Math.abs(actor.position[0] - 3) < 0.05, 'head-on input must not choose a random sideways direction')
  assert.ok(actor.position[1] > -1.1)
  for (let i = 0; i < 80; i++) { await walk(sim, [0.2, -1], 1); assert.ok(walkable(actor.position, actor.radius)) }
  assert.ok(actor.position[0] > 3.65, 'slight diagonal input continues along the wall')
  assert.ok(Math.abs(actor.angle - Math.PI / 2) < 0.1, 'the student faces the actual sliding direction')
})

test('shallow-angle wall sliding clears sampled collision-grid lips at different frame rates', async () => {
  for (const delta of [1 / 120, 1 / 60, 1 / 30, 0.05]) {
    const { sim, actor } = setup(); await flush(); sim.control(1); await flush()
    actor.radius = 0.4201018910321505; actor.position = [17.4229665469304, 1.6801242707923911]
    const start = [...actor.position], direction = cameraWalkDirection([-1, 0], [3.5, 6])
    for (let i = 0; i < Math.ceil(2 / delta); i++) {
      sim.tick(delta); sim.steer(direction, delta); await flush()
      assert.ok(walkable(actor.position, actor.radius))
    }
    assert.ok(actor.position[0] + actor.position[1] < start[0] + start[1] - 0.35, `wall sliding must not freeze at ${1 / delta} FPS`)
  }
})

test('held input keeps wall sliding steady at low and high frame rates', async () => {
  for (const [position, direction] of [
    [[3, -0.7], [0.2, -1]],
    [[17.4229665469304, 1.6801242707923911], cameraWalkDirection([-1, 0], [3.5, 6])],
  ] as [Point, Point][]) for (const fps of [20, 30, 60, 120]) {
    const { sim, actor } = setup(); await flush(); sim.control(1); await flush(); actor.position = [...position]
    const speeds: number[] = [], headings: number[] = []
    for (let frame = 0; frame < fps * 3; frame++) {
      const start = actor.position
      sim.tick(1 / fps); sim.steer(direction, 1 / fps); await flush()
      assert.ok(walkable(actor.position, actor.radius))
      if (frame >= fps) {
        const dx = actor.position[0] - start[0], dz = actor.position[1] - start[1]
        speeds.push(Math.hypot(dx, dz) * fps); headings.push(Math.atan2(dx, dz))
      }
    }
    assert.ok(Math.min(...speeds) > 0.15, `wall sliding keeps moving at ${fps} FPS`)
    assert.ok(Math.max(...speeds) - Math.min(...speeds) < 0.08, `slide speed must not alternate with full-speed inward input at ${fps} FPS`)
    assert.ok(headings.slice(1).every((angle, i) => Math.abs(Math.atan2(Math.sin(angle - headings[i]), Math.cos(angle - headings[i]))) < 0.15), `slide direction must not snap back into the wall at ${fps} FPS`)
    const start = actor.position, away: Point = position[0] === 3 ? [0, 1] : [Math.SQRT1_2, -Math.SQRT1_2]
    sim.steer(away, 1 / fps)
    assert.ok(Math.hypot(actor.position[0] - start[0], actor.position[1] - start[1]) > 1 / fps, 'walking away immediately releases wall contact')
  }
})

test('wall sliding follows the curved sink corner without bouncing between headings', async () => {
  for (const fps of [20, 30, 60, 120]) {
    const { sim, actor } = setup(); await flush(); sim.control(1); await flush()
    actor.position = [10.431821757791614, 8.471004765110804]
    let previous: number | null = null
    for (let frame = 0; frame < fps * 5; frame++) {
      const start = actor.position
      sim.tick(1 / fps); sim.steer([0, -1], 1 / fps); await flush()
      assert.ok(walkable(actor.position, actor.radius))
      const dx = actor.position[0] - start[0], dz = actor.position[1] - start[1]
      if (Math.hypot(dx, dz) > 0.0001) {
        const heading = Math.atan2(dx, dz)
        if (previous !== null) assert.ok(Math.abs(Math.atan2(Math.sin(heading - previous), Math.cos(heading - previous))) < 0.4, `sink contact must not jerk the movement direction at ${fps} FPS`)
        previous = heading
      }
    }
    assert.ok(actor.position[1] < 3.5, 'slide around the sink and continue onto the open floor')
  }
})

test('the garden gap between a bench and planter allows walking in both directions', async () => {
  const { sim, actor } = setup(); await flush(); sim.control(1); await flush()
  actor.position = [26.3, 4.7]
  for (const direction of [[0, 1], [0, -1]] as Point[]) {
    await walk(sim, direction, 60)
    assert.ok(walkable(actor.position, actor.radius))
    assert.ok(direction[1] > 0 ? actor.position[1] > 7.7 : actor.position[1] < 5, 'bench edges and flower details must not close the visible garden aisle')
  }
  assert.equal(walkable([25.63, 6]), false, 'the bench center remains solid')
  assert.equal(walkable([28, 6]), false, 'the garden perimeter remains solid')
})

test('the narrow changing-room gap between storage boxes is passable without entering their cores', async () => {
  const { sim, actor } = setup(); await flush(); sim.control(1); await flush()
  actor.position = [0.4, -4.5]
  assert.ok(walkable([1.75, -5.375]), 'the visible gap between the locker fronts and a storage box must stay usable')
  await walk(sim, [0, -1], 16)
  for (let i = 0; i < 60; i++) { await walk(sim, [1, 0], 1); assert.ok(walkable(actor.position, actor.radius)) }
  assert.ok(actor.position[0] > 2.8, 'walk across the narrow storage aisle')
  await walk(sim, [-1, 0], 60)
  assert.ok(actor.position[0] < 0.7, 'the same gap can be used to leave again')
  for (const point of [[1.8, -4.7], [-1.25, -2.75]] as Point[]) assert.equal(walkable(point), false, 'storage box centers remain solid')
})

test('controlled students can chat nearby, cancel by walking, and return to manual control after the chat', async () => {
  const { sim, actor, mapping } = setup(); sim.add(2, 'Second', mapping); sim.ready(2); await flush()
  const other = sim.actors.get(2)!; other.position = [2, 1]; other.roam = false
  sim.control(1); await flush(); assert.equal(sim.nearbyStudent()?.id, 2); assert.equal(sim.interact(), true)
  for (let i = 0; i < 160; i++) { sim.tick(0.05); sim.steer([0, 0], 0.05); await flush() }
  assert.equal(actor.state, 'controlled'); assert.equal(actor.encounter, null); assert.equal(actor.roam, false)
  assert.equal(sim.interact(), true); await flush(); sim.steer([-1, 0], 0.05); await flush()
  assert.equal(sim.encounters.size, 0); assert.equal(actor.state, 'controlled'); assert.equal(other.encounter, null)
  sim.remove(1); assert.equal(sim.controlledId, null)
})

test('nearby interaction rejects students separated by scenery and distant students', async () => {
  const { sim, actor, mapping } = setup(); sim.add(2, 'Second', mapping); sim.ready(2); await flush()
  const other = sim.actors.get(2)!; other.roam = false
  sim.control(1); await flush()
  actor.position = [-4.75, 7.75]; other.position = [-7.5, 6.75]
  assert.ok(Math.hypot(actor.position[0] - other.position[0], actor.position[1] - other.position[1]) < 3.2)
  assert.equal(socialClear(actor.position, other.position), false)
  assert.equal(sim.nearbyStudent(), null); assert.equal(sim.interact(), false)
  actor.position = [0, 1]; other.position = [8, 1]
  assert.equal(sim.nearbyStudent(), null)
})

test('Reisa can cross the clear dining-room entrance despite visitor reservations elsewhere in the hall', async () => {
  const { sim, actor, mapping } = setup(); actor.radius = 0.46726355615515547; actor.sectionId = 'lounge'
  for (const id of [2, 3, 4]) {
    assert.equal(sim.add(id, `Dining resident ${id}`, mapping, 'cafe'), true)
    sim.ready(id); sim.actors.get(id)!.roam = false
  }
  sim.actors.get(2)!.position = [19, 7]
  sim.actors.get(3)!.position = [6, 1]
  sim.actors.get(4)!.position = [8, 1]
  await flush(); sim.control(1); await flush()
  const center: Point = [15.034, 5.517], normal: Point = [Math.SQRT1_2, Math.SQRT1_2]
  actor.position = [center[0] - normal[0] * 2, center[1] - normal[1] * 2]
  for (let i = 0; i < 55; i++) { await walk(sim, normal, 1); assert.ok(walkable(actor.position, actor.radius)) }
  const across = (actor.position[0] - center[0]) * normal[0] + (actor.position[1] - center[1]) * normal[1]
  assert.ok(across > 0.9, `a clear doorway must not become a reservation barrier, got ${across}`)
})

test('direct control can enter and leave a room with three assigned visitors without waiting for a slot', async () => {
  const { sim, actor, mapping } = setup()
  actor.sectionId = 'lounge'
  for (let id = 2; id <= 4; id++) assert.equal(sim.add(id, `Resident ${id}`, mapping, 'office'), true)
  for (const id of [2, 3, 4]) { sim.ready(id); sim.actors.get(id)!.roam = false; sim.actors.get(id)!.position = [id * 2, 1] }
  await flush(); sim.control(1); await flush(); actor.position = [1, -1.75]; actor.sectionId = 'lounge'
  await walk(sim, [0, -1], 25)
  assert.ok(actor.position[1] < -3, 'room reservations must not block the open entrance')
  assert.equal(actor.sectionId, 'office'); assert.equal(sim.sectionPopulation('office'), 4)
  await walk(sim, [0, 1], 25)
  assert.ok(actor.position[1] > -1.9, 'the controlled student can leave the room again')
})

test('controlled students cross the entire open gym doorway without being stopped by the sliding-door center trim', async () => {
  for (const offset of [-0.5, 0, 0.5]) {
    const { sim, actor } = setup(); await flush(); sim.control(1); await flush()
    actor.radius = 0.65; actor.sectionId = 'office'
    const center: Point = [15.11856, 0.14265], along = Math.SQRT1_2 * offset, normal: Point = [Math.SQRT1_2, -Math.SQRT1_2]
    const start: Point = [center[0] + along - normal[0] * 1.3, center[1] + along - normal[1] * 1.3]
    actor.position = [...start]; assert.ok(walkable(start, actor.radius))
    await walk(sim, normal, 46)
    const across = (actor.position[0] - center[0]) * normal[0] + (actor.position[1] - center[1]) * normal[1]
    assert.ok(across > 1, `door crossing must work at lateral offset ${offset}, got ${across}`)
    assert.ok(walkable(actor.position, actor.radius))
    await walk(sim, [-normal[0], -normal[1]], 46)
    assert.ok(Math.hypot(actor.position[0] - start[0], actor.position[1] - start[1]) < 0.08, 'the doorway works in both directions')
  }
})

test('gym door outer jambs, nearby walls and windows still block controlled movement', async () => {
  for (const offset of [-2, 2]) {
    const { sim, actor } = setup(); await flush(); sim.control(1); await flush()
    actor.radius = 0.65
    const center: Point = [15.11856, 0.14265], along = Math.SQRT1_2 * offset, normal: Point = [Math.SQRT1_2, -Math.SQRT1_2]
    actor.position = [center[0] + along - normal[0] * 1.3, center[1] + along - normal[1] * 1.3]
    assert.ok(walkable(actor.position, actor.radius)); await walk(sim, normal, 70)
    const across = (actor.position[0] - center[0]) * normal[0] + (actor.position[1] - center[1]) * normal[1]
    assert.ok(across < -0.6, 'walking beside the opening must stop at the solid jamb/wall')
    assert.ok(walkable(actor.position, actor.radius))
  }
  assert.equal(walkable([17.4, -6.2], 0.35), false, 'the gym exterior windows remain solid')
})

test('fine doorway clearance is not narrowed again by the padded coarse floor mask', () => {
  assert.equal(walkable([16.875, 2.875], 0.4), true)
  assert.equal(walkable([16.875, 2.875], 0.5), false, 'the measured fine clearance still limits body size')
})
