import assert from 'node:assert/strict'
import test from 'node:test'
import { OFFICE_EXIT, officeClearance, sectionAt } from './playground-layout'
import { playgroundPath } from './playground-simulation'
import { PLAYGROUND_DISCOVERIES, collectPlaygroundDiscovery, readPlaygroundDiscoveries } from './playground-discovery'

test('every room has a discovery on connected, comfortably clear floor', () => {
  assert.equal(PLAYGROUND_DISCOVERIES.length, 7)
  for (const spot of PLAYGROUND_DISCOVERIES) {
    assert.equal(sectionAt(spot.point)?.id, spot.id)
    assert.ok(officeClearance(spot.point) >= 0.7, `${spot.name} needs room to approach`)
    assert.ok(playgroundPath(OFFICE_EXIT, spot.point), `${spot.name} must be reachable from the entrance`)
  }
})

test('the trail collects once per room and completes only after reaching all seven spots', () => {
  let visited: string[] = []
  for (const spot of PLAYGROUND_DISCOVERIES) {
    const old = visited
    visited = collectPlaygroundDiscovery(visited, spot.point)
    assert.equal(visited.length, old.length + 1); assert.equal(old.includes(spot.id), false)
    assert.equal(collectPlaygroundDiscovery(visited, spot.point), visited)
  }
  assert.equal(visited.length, 7)
})

test('distant rooms and hallway positions cannot award stamps through walls', () => {
  const visited: string[] = []
  assert.equal(collectPlaygroundDiscovery(visited, OFFICE_EXIT), visited)
  for (const spot of PLAYGROUND_DISCOVERIES) {
    assert.equal(collectPlaygroundDiscovery(visited, [spot.point[0] + 2, spot.point[1]]), visited)
  }
})

test('saved trail progress removes duplicates and unknown rooms without inventing completion', () => {
  assert.deepEqual(readPlaygroundDiscoveries('["lounge","lounge","unknown",null,42,"cafe"]'), ['lounge', 'cafe'])
  for (const saved of [null, 'broken', '{}']) assert.deepEqual(readPlaygroundDiscoveries(saved), [])
})
