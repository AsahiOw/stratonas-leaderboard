import assert from 'node:assert/strict'
import test from 'node:test'
import { mouthTileAtTime, mouthTileCell, mouthTileTextureTransform, mouthTileStateAtTime, normalizePlaybackTime } from './chibi-mouth'

test('source mouth flipping stays within the selected cell for four- and eight-column atlases', () => {
  for (const columns of [4, 8]) {
    const scale = 4 / columns
    const normal = mouthTileTextureTransform(102, false, columns, columns, scale, scale)
    const flipped = mouthTileTextureTransform(102, true, columns, columns, scale, scale)
    assert.equal(flipped.repeat[0], -scale)
    assert.equal(flipped.offset[0], 3 / columns)
    assert.equal(flipped.offset[1], normal.offset[1])
    for (const u of [0, .125, .25]) {
      assert.equal(u * flipped.repeat[0] + flipped.offset[0], (.25 - u) * normal.repeat[0] + normal.offset[0])
    }
    assert.deepEqual(mouthTileTextureTransform(102, true, columns, columns, -scale, scale), normal)
  }
})

const reactionEvents = [
  [0, 704],
  [0.3, 707],
  [1.2333334684, 300],
  [1.26666677, 704],
] as const

test('selects the current mouth tile at event boundaries and after the latest event', () => {
  assert.equal(mouthTileAtTime(reactionEvents, -0.001), 704)
  assert.equal(mouthTileAtTime(reactionEvents, 0.299), 704)
  assert.equal(mouthTileAtTime(reactionEvents, 0.3), 707)
  assert.equal(mouthTileAtTime(reactionEvents, 1.2333334684), 300)
  assert.equal(mouthTileAtTime(reactionEvents, 1.26666677), 704)
  assert.equal(mouthTileAtTime(reactionEvents, 99), 704)
})

test('starts a new action from its own first event', () => {
  assert.equal(mouthTileAtTime(reactionEvents, 0.4), 707)
  const pickupEvents = [[0, 704], [0.4333333671, 501]] as const
  assert.equal(mouthTileAtTime(pickupEvents, 0), 704)
  assert.equal(mouthTileAtTime(pickupEvents, 0.4333333671), 501)
})

test('uses metadata first tile instead of a Haruna-specific default', () => {
  assert.equal(mouthTileAtTime([[0.2, 305], [0.5, 407]], 0), 305)
  assert.equal(mouthTileAtTime([], 0), 704)
})

test('tracks horizontal flips and reset-to-default mouth events', () => {
  const events = [[0.2, 704, false], [0.5, 501, true], [0.8, 704, false]] as const
  assert.deepEqual(mouthTileStateAtTime(events, 0.1, 704), { tile: 704, flipX: false })
  assert.deepEqual(mouthTileStateAtTime(events, 0.6, 704), { tile: 501, flipX: true })
  assert.deepEqual(mouthTileStateAtTime(events, 0.9, 704), { tile: 704, flipX: false })
})

test('decodes mouth tile columns from the two-digit tile suffix', () => {
  assert.deepEqual(mouthTileCell(704), { column: 4, row: 7 })
  assert.deepEqual(mouthTileCell(407), { column: 7, row: 4 })
  assert.deepEqual(mouthTileCell(300), { column: 0, row: 3 })
})

test('normalizes looping time while clamping restarted and non-looping actions', () => {
  assert.equal(normalizePlaybackTime(1.25, 1, true), 0.25)
  assert.equal(normalizePlaybackTime(2, 1, true), 0)
  assert.equal(normalizePlaybackTime(-1, 1, true), 0)
  assert.equal(normalizePlaybackTime(2, 1, false), 1)
})
