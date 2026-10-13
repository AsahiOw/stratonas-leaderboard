import { OFFICE_SECTIONS, officeClearance, officeWalkCells, sectionAt } from './playground-layout'
import type { Point } from './playground-simulation'

export const PLAYGROUND_DISCOVERY_KEY = 'stratonas:playground-room-trail'
const cells = officeWalkCells().map(([x, z]): Point => [x / 4, z / 4])
export const PLAYGROUND_DISCOVERIES = OFFICE_SECTIONS.map(section => {
  const score = (point: Point) => Math.min(1.5, officeClearance(point)) - Math.hypot(point[0] - section.center[0], point[1] - section.center[1]) * 0.15
  const point = cells.filter(point => sectionAt(point)?.id === section.id).sort((a, b) => score(b) - score(a))[0]
  return { id: section.id, name: section.name, point }
})

export function readPlaygroundDiscoveries(value: string | null): string[] {
  try {
    const saved = JSON.parse(value || '[]')
    return Array.isArray(saved) ? [...new Set(saved.filter(id => PLAYGROUND_DISCOVERIES.some(spot => spot.id === id)))] : []
  } catch { return [] }
}

export function collectPlaygroundDiscovery(visited: string[], position: Point) {
  const room = sectionAt(position)?.id
  const spot = PLAYGROUND_DISCOVERIES.find(spot => spot.id === room && !visited.includes(spot.id) && Math.hypot(position[0] - spot.point[0], position[1] - spot.point[1]) <= 0.9)
  return spot ? [...visited, spot.id] : visited
}
