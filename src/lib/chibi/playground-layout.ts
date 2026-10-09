import navigation from './playground-navigation.json'
import { STUDENT_RADIUS } from './playground-constants'
export { STUDENT_RADIUS } from './playground-constants'

type Point = [number, number]
export type OfficeSection = { id: string; name: string; center: Point; color: string; polygon: Point[] }
// Regions follow the supplied office's rooms, including its angled walls.
export const OFFICE_SECTIONS: OfficeSection[] = [
  { id: 'lounge', name: 'Lounge', center: [-8, -6], color: '#dddced', polygon: [[-23, -6], [-17.5, -11.5], [-8, -11.5], [-2.5, -6], [-2.5, -3], [-11, -3], [-14, -5], [-20, -3]] },
  { id: 'library', name: 'Shop', center: [-24, 2], color: '#dce7ed', polygon: [[-28, 0], [-24, -3], [-20, 1], [-20, 7], [-24, 9], [-28, 5]] },
  { id: 'meeting', name: 'Meeting room', center: [7.5, -12.5], color: '#d7e8f0', polygon: [[5, -17.7], [15, -17.7], [15, -8.7], [11, -8.7], [9, -11], [5, -11]] },
  { id: 'study', name: 'Gym', center: [14.5, -4.5], color: '#ddeef0', polygon: [[11.4, -8.5], [18.4, -8.5], [23.2, -0.5], [20, 2.8], [17, 2.8]] },
  { id: 'games', name: 'Game room', center: [-4, 9], color: '#dad8ee', polygon: [[-9.5, 7.55], [1.4, 7.85], [1.3, 12.6], [-4.7, 12.45]] },
  { id: 'cafe', name: 'Café', center: [14.5, 6], color: '#f0e7d6', polygon: [[12.2, 6.7], [16, 2.8], [23.2, 2.8], [23.2, 8], [18, 13.2], [12.2, 13.2]] },
  { id: 'office', name: 'Changing room', center: [1, -3], color: '#dce8f0', polygon: [[-2.5, -6.2], [5.5, -6.2], [5.5, -1.9], [-2.5, -1.9]] },
]
export const SECTION_TARGET_MAX = 3
export const OFFICE_BOUNDS = { x: 29, z: 19 }
export const OFFICE_EXIT: Point = [-19, 8]

export function sectionAt(point: Point) {
  return OFFICE_SECTIONS.find(section => {
    let inside = false
    for (let i = 0, j = section.polygon.length - 1; i < section.polygon.length; j = i++) {
      const a = section.polygon[i], b = section.polygon[j]
      if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
    }
    return inside
  })
}

export function officeClearance(point: Point) {
  const step = navigation.clearanceStep, x = (point[0] - navigation.origin[0]) / step, z = (point[1] - navigation.origin[1]) / step
  let clearance = 0
  for (const i of [Math.floor(x), Math.ceil(x)]) for (const j of [Math.floor(z), Math.ceil(z)]) {
    const sample = navigation.clearance[j]?.[i]
    if (sample) clearance = Math.max(clearance, (sample.charCodeAt(0) - 33) / 32 - Math.hypot(x - i, z - j) * step)
  }
  return clearance
}

// The fine clearance field already accounts for body size. The legacy coarse
// floor rows were padded before baking and would shrink openings a second time.
export function officeFloor(point: Point, radius = STUDENT_RADIUS) {
  return officeClearance(point) >= radius
}
const walkCells = new Map<number, Point[]>()
export function officeWalkCells(radius = STUDENT_RADIUS) {
  const bucket = Math.ceil(radius * 20 - 0.000001) / 20, cached = walkCells.get(bucket)
  if (cached) return cached
  const cells: Point[] = [], floorCells = new Set<string>()
  for (let x = -OFFICE_BOUNDS.x * 4; x <= OFFICE_BOUNDS.x * 4; x++) for (let z = -OFFICE_BOUNDS.z * 4; z <= OFFICE_BOUNDS.z * 4; z++) if (officeFloor([x / 4, z / 4], bucket)) floorCells.add(`${x},${z}`)
  const entry: Point = [OFFICE_EXIT[0] * 4, OFFICE_EXIT[1] * 4], connected = new Set([entry.join(',')]), queue = [entry]
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i]; cells.push(queue[i])
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const next: Point = [x + dx, z + dz], key = next.join(',')
      if (floorCells.has(key) && !connected.has(key) && [1, 2, 3].every(step => officeFloor([(x + dx * step / 4) / 4, (z + dz * step / 4) / 4], bucket))) { connected.add(key); queue.push(next) }
    }
  }
  walkCells.set(bucket, cells); return cells
}
export const OFFICE_WALK_CELLS = officeWalkCells()

export function randomSectionTargets(random = Math.random) {
  const values = [1, 2, 3, ...Array.from({ length: 4 }, () => 1 + Math.floor(random() * SECTION_TARGET_MAX))]
  for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]] }
  return new Map(OFFICE_SECTIONS.map((section, i) => [section.id, values[i]]))
}
