import type { PlaygroundMapping, PlaygroundRole } from './playground-mapping'
import { OFFICE_SECTIONS, SECTION_TARGET_MAX, OFFICE_EXIT, OFFICE_WALK_CELLS, STUDENT_RADIUS, officeClearance, officeFloor, officeWalkCells, sectionAt, randomSectionTargets } from './playground-layout'

export type Point = [number, number]
export type PlaygroundActor = {
  id: number; name: string; position: Point; angle: number; radius: number; roam: boolean; ready: boolean
  mapping: PlaygroundMapping; state: 'loading' | 'idle' | 'controlled' | 'walking' | 'yielding' | 'waiting' | 'acting' | 'dragging' | 'fading' | 'error'
  label: string; path: Point[]; remaining: number; cooldown: number; blockedFor: number; encounter: number | null
  pending: boolean; oneShot: string | null; generation: number; age: number; social: 'chat' | 'heart' | 'sparkle' | 'music' | 'idea' | 'question' | null; speaking: boolean; retryIn: number; lastSocial: number; socialCooldown: number; leaving: boolean; opacity: number; sectionId: string; arrivalTarget: Point | null
}
type Encounter = { id: number; actors: number[]; roles: PlaygroundRole[]; phase: 'approach' | 'playing'; elapsed: number; minimumDuration: number; mood: NonNullable<PlaygroundActor['social']> }
export type PlaygroundPlayback = (id: number, clip: string, loop: boolean, movement: boolean) => Promise<boolean>
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
export const STUDENT_SPACING = 1.15
// Manual walking allows hair/equipment overlap, while AI keeps comfortable spacing.
const STUDENT_CONTACT_DISTANCE = 0.5
const studentSpacing = (first: Pick<PlaygroundActor, 'radius'>, second: Pick<PlaygroundActor, 'radius'>) => Math.max(STUDENT_SPACING, first.radius + second.radius)
export const PLAYGROUND_CAPACITY = 21
export const PLAYGROUND_EXIT: Point = OFFICE_EXIT
export const DEPARTURE_FADE_SECONDS = 1.5
export const playgroundStudentName = (name: string) => name.split(/\s*\(|\s*\*/)[0].trim()
export const playgroundStudentKey = (name: string) => playgroundStudentName(name).toLocaleLowerCase('en')
export function walkable(point: Point, radius = STUDENT_RADIUS) {
  return officeFloor(point, radius)
}

export function socialClear(first: Point, second: Point) {
  const steps = Math.max(1, Math.ceil(distance(first, second) / 0.08))
  for (let i = 0; i <= steps; i++) if (!walkable([first[0] + (second[0] - first[0]) * i / steps, first[1] + (second[1] - first[1]) * i / steps])) return false
  return true
}

export function turnTowards(angle: number, target: number, delta: number) {
  const difference = Math.atan2(Math.sin(target - angle), Math.cos(target - angle))
  return angle + Math.sign(difference) * Math.min(Math.abs(difference), delta * 4)
}

export function cameraWalkDirection(input: Point, cameraOffset: Point): Point {
  const length = Math.hypot(...cameraOffset) || 1
  const x = cameraOffset[0] / length, z = cameraOffset[1] / length
  return [input[0] * z - input[1] * x, -input[0] * x - input[1] * z]
}

// A small floor grid keeps routes around scenery inexpensive and deterministic.
export function playgroundPath(start: Point, end: Point, occupied: Point[] = [], radius = STUDENT_RADIUS): Point[] | null {
  const floorClear = (point: Point) => walkable(point, radius)
  const clear = (point: Point) => floorClear(point) && occupied.every(other => distance(point, other) >= STUDENT_SPACING)
  const segment = (a: Point, b: Point) => {
    const steps = Math.ceil(distance(a, b) / 0.02)
    for (let i = 1; i <= steps; i++) {
      const point: Point = [a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps]
      if (!floorClear(point) || occupied.some(other => distance(point, other) < STUDENT_SPACING && distance(point, other) < distance(a, other) - 0.001)) return false
    }
    return true
  }
  if (!clear(end)) return null
  if (distance(start, end) < 0.03) return []
  if (segment(start, end)) return [end]
  const cells = officeWalkCells(radius).filter(([x, z]) => clear([x / 4, z / 4])), key = (p: Point) => `${p[0]},${p[1]}`
  const nearest = (p: Point) => cells.map(cell => ({ cell, distance: (cell[0] / 4 - p[0]) ** 2 + (cell[1] / 4 - p[1]) ** 2 })).filter(cell => cell.distance <= 36).sort((a, b) => a.distance - b.distance).slice(0, 128).find(({ cell }) => segment(p, [cell[0] / 4, cell[1] / 4]))?.cell
  const first = nearest(start), last = nearest(end), allowed = new Set(cells.map(key))
  if (!first || !last) return null
  const queue = [{ point: first, cost: 0, score: distance(first, last) }], costs = new Map([[key(first), 0]]), parents = new Map<string, Point | null>([[key(first), null]])
  const push = (value: typeof queue[number]) => {
    queue.push(value); let i = queue.length - 1
    while (i > 0) { const parent = (i - 1) >> 1; if (queue[parent].score <= value.score) break; queue[i] = queue[parent]; i = parent }; queue[i] = value
  }
  const pop = () => {
    const value = queue[0], tail = queue.pop()!
    if (queue.length) {
      let i = 0
      while (i * 2 + 1 < queue.length) {
        let child = i * 2 + 1
        if (child + 1 < queue.length && queue[child + 1].score < queue[child].score) child++
        if (queue[child].score >= tail.score) break
        queue[i] = queue[child]; i = child
      }
      queue[i] = tail
    }
    return value
  }
  while (queue.length) {
    const node = pop(), current = node.point
    if (node.cost !== costs.get(key(current))) continue
    if (key(current) === key(last)) break
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const next: Point = [current[0] + dx, current[1] + dz]
      const cost = node.cost + Math.hypot(dx, dz)
      if (allowed.has(key(next)) && cost < (costs.get(key(next)) ?? Infinity) && segment([current[0] / 4, current[1] / 4], [next[0] / 4, next[1] / 4])) { parents.set(key(next), current); costs.set(key(next), cost); push({ point: next, cost, score: cost + distance(next, last) }) }
    }
  }
  if (!parents.has(key(last))) return null
  const path: Point[] = [end]
  let current: Point | null = last
  while (current) { path.unshift([current[0] / 4, current[1] / 4]); current = parents.get(key(current)) ?? null }
  // Remove grid stair-steps only when the complete shortcut stays clear.
  const smooth: Point[] = []
  let anchor = start, i = 0
  while (i < path.length) {
    let next = i
    for (let j = i + 1; j < path.length; j++) { if (!segment(anchor, path[j])) break; next = j }
    smooth.push(path[next]); anchor = path[next]; i = next + 1
  }
  const rounded: Point[] = []
  for (let i = 0; i < smooth.length - 1; i++) {
    const previous = i ? smooth[i - 1] : start, corner = smooth[i], next = smooth[i + 1]
    const before = distance(previous, corner), after = distance(corner, next), trim = Math.min(0.45, before / 3, after / 3)
    const enter: Point = [corner[0] + (previous[0] - corner[0]) * trim / before, corner[1] + (previous[1] - corner[1]) * trim / before]
    const leave: Point = [corner[0] + (next[0] - corner[0]) * trim / after, corner[1] + (next[1] - corner[1]) * trim / after]
    const curve = Array.from({ length: 7 }, (_, j): Point => {
      const t = j / 6, u = 1 - t
      return [u * u * enter[0] + 2 * u * t * corner[0] + t * t * leave[0], u * u * enter[1] + 2 * u * t * corner[1] + t * t * leave[1]]
    })
    if (trim > 0.08 && curve.every((point, j) => segment(j ? curve[j - 1] : rounded.at(-1) ?? start, point))) rounded.push(...curve)
    else rounded.push(corner)
  }
  rounded.push(smooth.at(-1)!)
  return rounded
}

export class PlaygroundSimulation {
  actors = new Map<number, PlaygroundActor>()
  encounters = new Map<number, Encounter>()
  paused = false
  controlledId: number | null = null
  private controlRoam = true
  private controlWalking = false
  sectionTargets: Map<string, number>
  private populationIn = 35
  private sequence = 0
  private decision = 2
  constructor(private play: PlaygroundPlayback, private duration: (id: number, clip: string) => number, private random = Math.random, private stop: (id: number) => void = () => {}, private animationFinished?: (id: number, clip: string) => boolean) { this.sectionTargets = randomSectionTargets(random) }

  hasStudent(name: string) { return [...this.actors.values()].some(actor => playgroundStudentKey(actor.name) === playgroundStudentKey(name)) }
  sectionPopulation(sectionId: string) { return [...this.actors.values()].filter(actor => actor.sectionId === sectionId || sectionAt(actor.position)?.id === sectionId || sectionAt(actor.path.at(-1) ?? actor.position)?.id === sectionId).length }
  private populationTarget() { return Math.min(PLAYGROUND_CAPACITY, [...this.sectionTargets.values()].reduce((sum, target) => sum + target, 0)) }
  vacantSection() {
    return this.actors.size < this.populationTarget() ? OFFICE_SECTIONS.find(section => this.sectionPopulation(section.id) < (this.sectionTargets.get(section.id) ?? 1))?.id ?? OFFICE_SECTIONS[0].id : null
  }
  surplusVisitor(protectedIds: number[] = []) {
    if (this.actors.size <= this.populationTarget()) return null
    return [...this.actors.values()].find(actor => !actor.leaving && actor.roam && !protectedIds.includes(actor.id) && actor.state === 'idle' && !actor.pending)?.id ?? null
  }
  add(id: number, name: string, mapping: PlaygroundMapping, sectionId?: string) {
    if (this.actors.has(id) || this.hasStudent(name) || this.actors.size >= PLAYGROUND_CAPACITY) return false
    const sections = OFFICE_SECTIONS.filter(section => !sectionId || section.id === sectionId)
    const section = sections.find(section => this.sectionPopulation(section.id) < SECTION_TARGET_MAX) ?? sections.sort((a, b) => this.sectionPopulation(a.id) - this.sectionPopulation(b.id))[0]
    if (!section) return false
    const positions: Point[] = []
    for (const z of [0.5, -1, 2, -2]) for (const x of [-1.7, 0, 1.7, -3, 3]) positions.push([section.center[0] + x, section.center[1] + z])
    positions.push(...OFFICE_WALK_CELLS.map(([x, z]) => [x / 4, z / 4] as Point).filter(point => sectionAt(point)?.id === section.id).sort((a, b) => distance(a, section.center) - distance(b, section.center)))
    const position = positions.find(point => sectionAt(point)?.id === section.id && walkable(point) && [...this.actors.values()].every(actor => distance(actor.arrivalTarget ?? actor.position, point) >= studentSpacing(actor, { radius: STUDENT_RADIUS })) && playgroundPath(point, PLAYGROUND_EXIT))
    if (!position) return false
    this.actors.set(id, { id, name, mapping, position, angle: 0, radius: STUDENT_RADIUS, roam: true, ready: false, state: 'loading', label: 'Arriving…', path: [], remaining: 0, cooldown: 2, blockedFor: 0, encounter: null, pending: false, oneShot: null, generation: 0, age: 0, social: null, speaking: false, retryIn: 0, lastSocial: 0, socialCooldown: 0, leaving: false, opacity: 1, sectionId: section.id, arrivalTarget: null })
    return true
  }
  invite(id: number, name: string, mapping: PlaygroundMapping, sectionId?: string) {
    if (!mapping.roles.walk.length || !this.add(id, name, mapping, sectionId)) return false
    const actor = this.actors.get(id)!
    actor.arrivalTarget = actor.position; actor.position = [...PLAYGROUND_EXIT]; actor.opacity = 0
    return true
  }
  ready(id: number, radius = STUDENT_RADIUS) {
    const actor = this.actors.get(id)
    if (actor) {
      if (actor.encounter !== null) this.cancel(id)
      actor.radius = radius
      const clear = (point: Point) => walkable(point, radius) && [...this.actors.values()].every(other => other === actor || distance(other.arrivalTarget ?? other.position, point) >= studentSpacing(actor, other))
      const destination = actor.arrivalTarget ?? actor.position
      if (!clear(destination) || !playgroundPath(destination, PLAYGROUND_EXIT, [], radius)) {
        const candidates = officeWalkCells(radius).map(([x, z]) => [x / 4, z / 4] as Point).filter(point => { const section = sectionAt(point); return !section || section.id === actor.sectionId }).sort((a, b) => Number(!sectionAt(a)) - Number(!sectionAt(b)) || distance(a, actor.position) - distance(b, actor.position))
        const position = candidates.find(point => clear(point) && playgroundPath(point, PLAYGROUND_EXIT, [], radius))
        if (!position) { this.failed(actor, 'No clear space for this student · retry student'); return }
        if (actor.arrivalTarget) actor.arrivalTarget = position; else actor.position = position
      }
      actor.ready = true
      if (actor.arrivalTarget) { actor.position = [...PLAYGROUND_EXIT]; actor.opacity = 0; actor.retryIn = 0; actor.state = 'waiting'; actor.label = 'Waiting at the entrance'; this.animate(actor, 'idle') }
      else this.idle(actor)
    }
  }
  fail(id: number, message: string) { const actor = this.actors.get(id); if (actor) this.failed(actor, message) }
  remove(id: number) { if (this.controlledId === id) this.releaseControl(); this.cancel(id); this.actors.delete(id) }
  depart(id: number) {
    const actor = this.actors.get(id)
    if (!actor || actor.leaving) return false
    if (this.controlledId === id) this.releaseControl()
    if (!actor.ready || actor.opacity === 0) { this.remove(id); return true }
    if (!this.available(actor, 'walk')) return false
    this.cancel(id); actor.leaving = true; actor.roam = false; actor.social = null
    const path = this.route(actor, PLAYGROUND_EXIT)
    if (path) this.walk(actor, path, 'Heading home')
    else { actor.path = [PLAYGROUND_EXIT]; actor.state = 'yielding'; actor.retryIn = 0.7; actor.remaining = 30 }
    return true
  }
  available(actor: PlaygroundActor, role: PlaygroundRole) { return actor.mapping.roles[role].length > 0 }
  private animate(actor: PlaygroundActor, role: PlaygroundRole): number {
    const entries = actor.mapping.roles[role]
    actor.oneShot = null
    if (!entries.length) { this.stop(actor.id); return 0 }
    const entry = entries[Math.floor(this.random() * entries.length)], generation = ++actor.generation
    if (actor.state === 'acting' && !entry.loop) actor.oneShot = entry.clip
    actor.pending = true
    void this.play(actor.id, entry.clip, entry.loop, role === 'walk').then(played => {
      if (this.actors.get(actor.id) !== actor || actor.generation !== generation) return
      actor.pending = false
      if (!played) this.failed(actor)
    }).catch(() => {
      if (this.actors.get(actor.id) !== actor || actor.generation !== generation) return
      this.failed(actor)
    })
    const duration = this.duration(actor.id, entry.clip) || 1
    return Math.max(1, entry.loop ? Math.min(15, duration) : duration)
  }
  private finishedActing(actor: PlaygroundActor) {
    return actor.remaining <= 0 && (!actor.oneShot || !this.animationFinished || this.animationFinished(actor.id, actor.oneShot))
  }
  private failed(actor: PlaygroundActor, message = 'Animation failed · retry student') {
    actor.oneShot = null
    if (actor.leaving) { actor.generation++; actor.pending = false; actor.state = 'yielding'; actor.retryIn = 3; actor.label = 'Waiting for departure animation'; this.stop(actor.id); return }
    actor.ready = false; this.cancel(actor.id); actor.generation++; actor.pending = false; actor.path = []; actor.encounter = null
    actor.state = 'error'; actor.label = message
  }
  private idle(actor: PlaygroundActor, keepAnimation = false) {
    actor.generation++; actor.pending = false; actor.path = []; actor.encounter = null; actor.state = this.controlledId === actor.id ? 'controlled' : 'idle'
    if (this.controlledId === actor.id) this.controlWalking = false
    actor.arrivalTarget = null
    actor.label = actor.state === 'controlled' ? 'Under your control' : actor.roam ? 'Taking a break' : 'Staying here'; actor.social = null; actor.speaking = false; actor.cooldown = 3 + this.random() * 4
    if (!actor.leaving) actor.sectionId = sectionAt(actor.position)?.id ?? actor.sectionId
    if (actor.ready && !keepAnimation) this.animate(actor, 'idle')
  }
  cancel(id: number) {
    const actor = this.actors.get(id)
    if (!actor || actor.leaving) return
    const encounter = actor.encounter === null ? null : this.encounters.get(actor.encounter)
    if (encounter) {
      this.encounters.delete(encounter.id)
      for (const id of encounter.actors) { const participant = this.actors.get(id); if (participant) this.idle(participant) }
    } else if (actor.ready) this.idle(actor)
  }
  control(id: number) {
    const actor = this.actors.get(id)
    if (this.paused || !actor?.ready || actor.pending || actor.leaving || actor.arrivalTarget || actor.opacity === 0 || !this.available(actor, 'walk')) return false
    this.releaseControl(); this.controlRoam = actor.roam; this.controlledId = id; actor.roam = false; this.cancel(id)
    return true
  }
  releaseControl() {
    const actor = this.actors.get(this.controlledId ?? -1)
    this.controlledId = null; this.controlWalking = false
    if (actor) { actor.roam = this.controlRoam; this.cancel(actor.id) }
  }
  steer(direction: Point, delta: number) {
    const actor = this.actors.get(this.controlledId ?? -1)
    if (this.paused || !actor?.ready || actor.leaving) return
    const length = Math.hypot(...direction), moving = length > 0.001
    if (actor.state !== 'controlled') { if (!moving) return; this.cancel(actor.id) }
    if (moving !== this.controlWalking) {
      this.controlWalking = moving; actor.label = moving ? 'Walking with you' : 'Under your control'; this.animate(actor, moving ? 'walk' : 'idle')
    }
    if (!moving || actor.pending) return
    const stepTime = Math.max(0, Math.min(delta, 0.05)), dx = direction[0] / length, dz = direction[1] / length
    const travel = stepTime * 1.15, steps = Math.max(1, Math.ceil(travel / 0.02)), step = travel / steps, start = actor.position
    const others = [...this.actors.values()].filter(other => other !== actor && other.opacity > 0)
    const blocks = (point: Point, other: PlaygroundActor) => distance(point, other.position) < STUDENT_CONTACT_DISTANCE && distance(point, other.position) <= distance(actor.position, other.position) + 0.000001
    const clear = (point: Point) => walkable(point, actor.radius) && !others.some(other => blocks(point, other))
    for (let i = 0; i < steps; i++) {
      const [x, z] = actor.position, next: Point = [x + dx * step, z + dz * step]
      const clearance = officeClearance(actor.position), nearWall = clearance < actor.radius + 0.20
      if (!nearWall && clear(next)) actor.position = next
      else {
        // Clearance increases away from scenery, giving the actual wall normal,
        // including diagonal walls. Keep projecting while touching the wall so
        // tiny clear steps do not alternate between sliding and pushing inward.
        const other = others.find(other => blocks(next, other))
        const wall = (nearWall && !other) || !walkable(next, actor.radius)
        const normal: Point = wall
          ? [officeClearance([x + 0.125, z]) - officeClearance([x - 0.125, z]), officeClearance([x, z + 0.125]) - officeClearance([x, z - 0.125])]
          : other ? [x - other.position[0], z - other.position[1]] : [0, 0]
        const size = Math.hypot(...normal)
        if (size < 0.001) { if (clear(next)) actor.position = next; continue }
        // Ease into the tangent over a small contact band instead of snapping.
        const contact = wall && nearWall ? Math.min(1, (actor.radius + 0.20 - clearance) / 0.14) : 1
        const nx = normal[0] / size, nz = normal[1] / size, into = Math.min(0, dx * nx + dz * nz) * contact
        const tx = dx - nx * into, tz = dz - nz * into, speed = Math.hypot(tx, tz)
        if (speed < 0.1) { if (clear(next)) actor.position = next; continue }
        // A slight outward bias handles the sampled field and curved furniture.
        for (const bias of [0, 0.25, 1, 4]) {
          const sx = tx + nx * speed * bias, sz = tz + nz * speed * bias, limit = Math.max(1, Math.hypot(sx, sz))
          const slide: Point = [x + sx * step / limit, z + sz * step / limit]
          if (clear(slide)) { actor.position = slide; break }
        }
      }
    }
    if (distance(start, actor.position) > 0.0001) actor.angle = turnTowards(actor.angle, Math.atan2(actor.position[0] - start[0], actor.position[1] - start[1]), stepTime)
    actor.sectionId = sectionAt(actor.position)?.id ?? actor.sectionId
  }
  nearbyStudent() {
    const actor = this.actors.get(this.controlledId ?? -1)
    if (!actor?.ready || actor.encounter !== null || actor.state === 'acting') return null
    return [...this.actors.values()].filter(other => other !== actor && other.ready && !other.pending && !other.leaving && !other.arrivalTarget && other.opacity > 0 && other.encounter === null && this.available(other, 'walk') && distance(actor.position, other.position) <= 3.2 && socialClear(actor.position, other.position)).sort((a, b) => distance(actor.position, a.position) - distance(actor.position, b.position))[0] ?? null
  }
  interact() {
    const other = this.nearbyStudent()
    return !this.paused && !!other && this.greet(this.controlledId!, other.id)
  }
  move(id: number, target: Point) {
    const actor = this.actors.get(id)
    if (!actor?.ready || actor.leaving || actor.arrivalTarget || !this.available(actor, 'walk')) return false
    const path = this.route(actor, target)
    if (!path) return false
    this.cancel(id); this.walk(actor, path, 'On my way'); return true
  }
  private route(actor: PlaygroundActor, target: Point) {
    return playgroundPath(actor.position, target, [...this.actors.values()].filter(other => other !== actor && other.opacity > 0).map(other => other.position), actor.radius)
  }
  beginDrag(id: number, facingAngle?: number) {
    const actor = this.actors.get(id)
    if (!actor?.ready || actor.leaving || actor.arrivalTarget || actor.state === 'error') return false
    this.cancel(id); actor.state = 'dragging'; actor.label = 'Being carried'; actor.social = null
    if (facingAngle !== undefined) actor.angle = facingAngle
    this.animate(actor, this.available(actor, 'pickup') ? 'pickup' : 'idle'); return true
  }
  drag(id: number, target: Point) {
    const actor = this.actors.get(id)
    if (actor?.state !== 'dragging' || !walkable(target, actor.radius) || [...this.actors.values()].some(other => other !== actor && other.opacity > 0 && distance(target, other.position) < studentSpacing(actor, other))) return false
    actor.position = target; actor.sectionId = sectionAt(target)?.id ?? actor.sectionId; return true
  }
  endDrag(id: number) {
    const actor = this.actors.get(id)
    if (actor?.state === 'dragging') { this.idle(actor); actor.cooldown = 12 }
  }
  replacement(protectedIds: number[] = []) {
    return [...this.actors.values()].filter(a => !a.leaving && a.age >= 45 && a.roam && !protectedIds.includes(a.id) && (a.state === 'idle' || a.state === 'error') && !a.pending && a.encounter === null).sort((a, b) => b.age - a.age)[0]?.id ?? null
  }
  private walk(actor: PlaygroundActor, path: Point[], label: string) {
    if (!path.length && actor.encounter === null) { if (actor.leaving) this.fade(actor); else this.idle(actor); return }
    actor.path = path; actor.state = path.length ? 'walking' : 'waiting'; actor.label = label; actor.remaining = 60; actor.blockedFor = 0; this.animate(actor, path.length ? 'walk' : 'idle')
  }
  react(id: number, role: 'reaction' | 'pickup' = 'reaction', facingAngle?: number) {
    const actor = this.actors.get(id)
    if (!actor?.ready || actor.leaving || actor.arrivalTarget || !this.available(actor, role)) return false
    this.cancel(id); actor.state = 'acting'; actor.label = role === 'pickup' ? 'Picked up' : 'Reacting to you'
    if (role === 'pickup' && facingAngle !== undefined) actor.angle = facingAngle
    actor.social = role === 'pickup' ? 'heart' : 'sparkle'
    actor.remaining = this.animate(actor, role); return true
  }
  roam(id: number, value: boolean) {
    const actor = this.actors.get(id)
    if (actor && !actor.leaving && !actor.arrivalTarget) { actor.roam = value; this.cancel(id) }
  }
  private free() { return [...this.actors.values()].filter(a => a.ready && a.roam && a.state === 'idle' && !a.pending && a.cooldown <= 0 && this.available(a, 'walk')) }
  private encounter(actors: PlaygroundActor[], targets: Point[], roles: PlaygroundRole[], label: string) {
    // Participants will vacate their current spots. Other visitors remain
    // obstacles; step-by-step separation still applies during the approach.
    const occupied = [...this.actors.values()].filter(actor => !actors.includes(actor) && actor.opacity > 0).map(actor => actor.position)
    if (!socialClear(targets[0], targets[1])) return false
    const stationary = [...this.actors.values()].filter(actor => !actors.includes(actor) && (!actor.roam || actor.state !== 'idle')).map(actor => actor.position)
    const paths = actors.map((actor, i) => {
      return playgroundPath(actor.position, targets[i], occupied, actor.radius)
        ?? playgroundPath(actor.position, targets[i], stationary, actor.radius)
    })
    if (paths.some(path => !path)) return false
    const moods: NonNullable<PlaygroundActor['social']>[] = ['heart', 'sparkle', 'music', 'idea', 'question']
    const encounter: Encounter = { id: ++this.sequence, actors: actors.map(a => a.id), roles, phase: 'approach', elapsed: 0, minimumDuration: 0, mood: moods[Math.floor(this.random() * moods.length)] }
    this.encounters.set(encounter.id, encounter)
    actors.forEach((actor, i) => { actor.encounter = encounter.id; this.walk(actor, paths[i]!, label) })
    return true
  }
  greet(firstId: number, secondId: number) {
    const first = this.actors.get(firstId), second = this.actors.get(secondId)
    if (!first?.ready || !second?.ready || first.leaving || second.leaving || first.arrivalTarget || second.arrivalTarget || first === second || !this.available(first, 'walk') || !this.available(second, 'walk')) return false
    this.cancel(firstId); this.cancel(secondId)
    const center: Point = [(first.position[0] + second.position[0]) / 2, (first.position[1] + second.position[1]) / 2]
    const dx = second.position[0] - first.position[0], dz = second.position[1] - first.position[1], length = Math.hypot(dx, dz) || 1
    const halfSpacing = Math.max(0.85, studentSpacing(first, second) / 2 + 0.1)
    const offset: Point = [dx / length * halfSpacing, dz / length * halfSpacing]
    const roles = [first, second].map(a => this.available(a, 'greeting') ? 'greeting' as const : this.available(a, 'reaction') ? 'reaction' as const : 'idle' as const)
    const targets: Point[] = length >= studentSpacing(first, second) && length <= 4 && socialClear(first.position, second.position) ? [first.position, second.position] : [[center[0] - offset[0], center[1] - offset[1]], [center[0] + offset[0], center[1] + offset[1]]]
    let accepted = this.encounter([first, second], targets, roles, 'Meeting a friend')
    if (!accepted) {
      const localSection = sectionAt(first.position)?.id === sectionAt(second.position)?.id ? sectionAt(first.position)?.id : undefined
      const centers = OFFICE_WALK_CELLS.map(([x, z]) => [x / 4, z / 4] as Point).filter(point => (!sectionAt(point) || sectionAt(point)?.id === localSection) && distance(point, center) < 5).sort((a, b) => Number(!!sectionAt(a)) - Number(!!sectionAt(b)) || distance(a, center) - distance(b, center))
      let routes = 0
      for (let attempt = 0; attempt < centers.length && routes < 4; attempt += 12) {
        const point = centers[attempt]
        for (const [dx, dz] of [[halfSpacing, 0], [0, halfSpacing]]) {
          const meeting: Point[] = [[point[0] - dx, point[1] - dz], [point[0] + dx, point[1] + dz]]
          if (sectionAt(meeting[0])?.id !== sectionAt(meeting[1])?.id || !socialClear(meeting[0], meeting[1]) || !walkable(meeting[0], first.radius) || !walkable(meeting[1], second.radius)) continue
          routes++
          if (this.encounter([first, second], meeting, roles, 'Meeting a friend')) { accepted = true; break }
        }
        if (accepted) break
      }
    }
    if (accepted) { first.lastSocial = this.sequence; second.lastSocial = this.sequence }
    return accepted
  }
  private fade(actor: PlaygroundActor) {
    actor.path = []; actor.state = 'fading'; actor.label = 'See you soon'; actor.remaining = DEPARTURE_FADE_SECONDS
    actor.social = null; actor.speaking = false; this.animate(actor, 'idle')
  }
  private makeWay(actor: PlaygroundActor, goal: Point) {
    const path = playgroundPath(actor.position, goal, [], actor.radius)
    if (!path) return
    const points = [actor.position, ...path]
    const nearRoute = (point: Point) => points.slice(1).some((end, i) => {
      const start = points[i], dx = end[0] - start[0], dz = end[1] - start[1]
      const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / (dx * dx + dz * dz || 1)))
      return distance(point, [start[0] + dx * t, start[1] + dz * t]) < STUDENT_SPACING
    })
    const friend = [...this.actors.values()].find(other => other !== actor && other.ready && other.roam && !other.leaving && other.state === 'idle' && !other.pending && nearRoute(other.position))
    if (!friend) return
    for (const radius of [1.6, 2.3, 3]) for (let direction = 0; direction < 8; direction++) {
      const angle = direction * Math.PI / 4, target: Point = [friend.position[0] + Math.cos(angle) * radius, friend.position[1] + Math.sin(angle) * radius]
      if (!nearRoute(target) && this.move(friend.id, target)) { friend.label = 'Making room for a friend'; return }
    }
  }
  tick(delta: number) {
    if (this.paused) return
    this.populationIn -= delta
    if (this.populationIn <= 0) {
      const section = OFFICE_SECTIONS[Math.floor(this.random() * OFFICE_SECTIONS.length)], previous = this.sectionTargets.get(section.id) ?? 1
      this.sectionTargets.set(section.id, 1 + (previous + Math.floor(this.random() * 2)) % SECTION_TARGET_MAX); this.populationIn = 30 + this.random() * 20
    }
    for (const actor of this.actors.values()) {
      if (actor.ready || actor.state === 'error') actor.age += delta
      actor.cooldown = Math.max(0, actor.cooldown - delta)
      actor.socialCooldown = Math.max(0, actor.socialCooldown - delta)
      if (actor.pending) continue
      if (actor.ready && actor.arrivalTarget && actor.opacity === 0) {
        actor.retryIn -= delta
        if (actor.retryIn > 0) continue
        actor.retryIn = 0.7
        if ([...this.actors.values()].some(other => other !== actor && other.opacity > 0 && distance(actor.position, other.position) < studentSpacing(actor, other))) { this.makeWay(actor, actor.arrivalTarget); continue }
        const path = this.route(actor, actor.arrivalTarget)
        if (!path) { this.makeWay(actor, actor.arrivalTarget); continue }
        actor.opacity = 1; this.walk(actor, path, 'Walking in'); continue
      }
      if (actor.state === 'fading') {
        actor.remaining -= delta; actor.opacity = Math.max(0, actor.remaining / DEPARTURE_FADE_SECONDS)
        if (actor.remaining <= 0) this.remove(actor.id)
        continue
      }
      if (actor.state === 'walking' || actor.state === 'yielding') {
        actor.remaining -= delta
        if (actor.remaining <= 0) {
          if (actor.leaving || actor.arrivalTarget) { actor.state = 'yielding'; actor.retryIn = 0; actor.remaining = 30; this.animate(actor, 'idle') }
          else { this.cancel(actor.id); continue }
        }
        if (actor.state === 'yielding') {
          actor.blockedFor += delta
          if (!actor.leaving && !actor.arrivalTarget && actor.blockedFor >= 4) { this.cancel(actor.id); continue }
          actor.retryIn -= delta
          if (actor.retryIn > 0) continue
          const goal = actor.path.at(-1), path = goal && this.route(actor, goal)
          if (!path) { if (goal) this.makeWay(actor, goal); actor.retryIn = 0.7; continue }
          actor.path = path; actor.state = 'walking'; actor.label = 'On my way'; this.animate(actor, 'walk'); continue
        }
        const target = actor.path[0]
        if (!target) {
          if (actor.encounter !== null) { actor.state = 'waiting'; actor.label = 'Waiting for a friend'; this.animate(actor, 'idle') }
          else if (actor.leaving) this.fade(actor)
          else this.idle(actor)
          continue
        }
        const length = distance(actor.position, target)
        if (length < 0.03) { actor.path.shift(); continue }
        const heading = Math.atan2(target[0] - actor.position[0], target[1] - actor.position[1])
        actor.angle = turnTowards(actor.angle, heading, delta)
        const turn = Math.abs(Math.atan2(Math.sin(heading - actor.angle), Math.cos(heading - actor.angle)))
        const step = Math.min(length, delta * 1.15 * Math.max(0.2, Math.cos(turn)))
        const next: Point = [actor.position[0] + (target[0] - actor.position[0]) / length * step, actor.position[1] + (target[1] - actor.position[1]) / length * step]
        const blocked = !walkable(next, actor.radius) || [...this.actors.values()].some(other => other !== actor && other.opacity > 0 && distance(next, other.position) < studentSpacing(actor, other) && distance(next, other.position) < distance(actor.position, other.position) - 0.001)
        if (blocked) { actor.state = 'yielding'; actor.label = 'Letting a friend pass'; actor.retryIn = 0.7; this.animate(actor, 'idle') }
        else { actor.position = next; actor.blockedFor = 0 }
      } else if (actor.state === 'acting' && actor.encounter === null) {
        actor.remaining -= delta; if (this.finishedActing(actor)) this.idle(actor)
      }
    }
    for (const encounter of [...this.encounters.values()]) {
      const actors = encounter.actors.flatMap(id => { const actor = this.actors.get(id); return actor ? [actor] : [] })
      if (actors.length !== encounter.actors.length) { this.encounters.delete(encounter.id); actors.forEach(actor => this.idle(actor)); continue }
      if (encounter.phase === 'approach' && actors.every(a => a.state === 'waiting' && !a.pending)) {
        if (!socialClear(actors[0].position, actors[1].position)) { this.cancel(actors[0].id); continue }
        encounter.phase = 'playing'; encounter.minimumDuration = 5 + this.random() * 3
        actors.forEach((actor, i) => {
          const facing = actors[1 - i].position
          actor.angle = turnTowards(actor.angle, Math.atan2(facing[0] - actor.position[0], facing[1] - actor.position[1]), delta)
          actor.state = 'acting'; actor.label = `Chatting with ${playgroundStudentName(actors[1 - i].name)}`
          actor.remaining = this.animate(actor, encounter.roles[i])
          actor.social = 'chat'; actor.speaking = i === 0
        })
      } else if (encounter.phase === 'playing') {
        if (actors.some(a => !a.pending)) encounter.elapsed += delta
        if (!socialClear(actors[0].position, actors[1].position)) { this.cancel(actors[0].id); continue }
        actors.forEach((actor, i) => {
          const facing = actors[1 - i].position
          actor.angle = turnTowards(actor.angle, Math.atan2(facing[0] - actor.position[0], facing[1] - actor.position[1]), delta)
          actor.speaking = Math.floor(encounter.elapsed / 1.6) % 2 === i; actor.social = actor.speaking ? 'chat' : encounter.elapsed % 3.2 > 2.4 ? encounter.mood : 'chat'
        })
        for (const actor of actors) {
          if (actor.pending || !actor.oneShot) continue
          actor.remaining -= delta
          if (this.animationFinished?.(actor.id, actor.oneShot) ?? actor.remaining <= 0) this.animate(actor, 'idle')
        }
        if (encounter.elapsed >= encounter.minimumDuration && actors.every(a => !a.pending && !a.oneShot)) {
          this.encounters.delete(encounter.id)
          for (const actor of actors) {
            this.idle(actor, true)
            actor.cooldown = 0.6 + this.random() * 0.4
            actor.socialCooldown = 18 + this.random() * 10
          }
        }
      }
    }
    this.decision -= delta
    if (this.decision > 0) return
    this.decision = 2
    const free = this.free().sort((a, b) => a.lastSocial - b.lastSocial)
    if (!free.length) return
    const chance = this.random()
    let wanderer: PlaygroundActor | undefined
    if (chance < 0.6) for (const actor of free.filter(a => a.socialCooldown <= 0)) {
      const friend = free.find(other => other !== actor && other.socialCooldown <= 0 && distance(actor.position, other.position) <= 5 && sectionAt(actor.position)?.id === sectionAt(other.position)?.id)
      if (friend) {
        if (this.greet(actor.id, friend.id)) return
        actor.lastSocial = ++this.sequence; friend.lastSocial = this.sequence
        wanderer = actor; break
      }
    }
    const actor = wanderer ?? free[Math.floor(this.random() * free.length)]
    this.stroll(actor)
  }

  private stroll(actor: PlaygroundActor) {
    const inHall = !sectionAt(actor.position), visitHall = !inHall && this.random() < 0.3
    const candidates = officeWalkCells(actor.radius).map(([x, z]) => [x / 4, z / 4] as Point).filter(point => {
      const section = sectionAt(point)?.id
      return (visitHall ? !section && distance(point, actor.position) < 8 : section === actor.sectionId)
        && distance(point, actor.position) > 1.4 && distance(point, actor.position) < 12
    })
    for (let attempt = 0; attempt < 8 && candidates.length; attempt++) {
      const target = candidates.splice(Math.floor(this.random() * candidates.length), 1)[0]
      if (this.move(actor.id, target)) { actor.label = visitHall ? 'Exploring the hall' : inHall ? 'Returning to the room' : 'Taking a stroll'; return true }
    }
    return false
  }
}
