import assert from 'node:assert/strict'
import test from 'node:test'
import { applyPlayerIdentity, PLAYER_IDENTITY_TTL_MS, readPlayerIdentity, type SavedPlayerIdentity } from './player-identity-cache'

const now = 1000000
const saved: SavedPlayerIdentity = {
  userId: 'owner', playerId: 'player', ign: 'New IGN', expiresAt: now + PLAYER_IDENTITY_TTL_MS,
  favouriteStudentData: { id: 2, name: 'New student', image: '/new.webp', portrait: '/portrait.webp', memorial: '/memorial.webm', portraitOffsetX: 7 },
}

test('browser records are account-scoped, bounded by the CDN stale window, and reject malformed data', () => {
  assert.deepEqual(readPlayerIdentity(JSON.stringify(saved), 'owner', now), saved)
  assert.equal(readPlayerIdentity(JSON.stringify(saved), 'other-user', now), null)
  assert.equal(readPlayerIdentity(JSON.stringify(saved), 'owner', saved.expiresAt), null)
  for (const record of ['{broken', '{}', 'null', JSON.stringify({ ...saved, expiresAt: Infinity }), JSON.stringify({ ...saved, favouriteStudentData: { id: '2' } })]) {
    assert.equal(readPlayerIdentity(record, 'owner', now), null)
  }
})

test('full player records use the local identity without changing their statistics, account, or public source data', () => {
  const source = { id: 'player', ign: 'Old IGN', username: 'unchanged', role: 'VIEWER', favouriteStudentId: 1, favouriteStudent: 'Old student', favouriteStudentData: { id: 1, name: 'Old student' }, entries: [{ score: 1234, rank: 9 }], journey: { bestRank: 3 } }
  const snapshot = structuredClone(source)
  const result = applyPlayerIdentity(source, saved, now)
  assert.equal(result.ign, 'New IGN')
  assert.equal(result.favouriteStudentId, 2)
  assert.equal(result.favouriteStudent, 'New student')
  assert.equal(result.favouriteStudentData, saved.favouriteStudentData)
  assert.equal(result.username, 'unchanged'); assert.equal(result.role, 'VIEWER')
  assert.equal(result.entries, source.entries); assert.equal(result.journey, source.journey)
  assert.deepEqual(source, snapshot)
})

test('nested leaderboard, roster, community and statistics identities update by player ID only', () => {
  const other = { playerId: 'other-player', name: 'Old IGN', favouriteStudentImage: '/other.webp', score: 100 }
  const source = {
    entries: [{ playerId: 'player', name: 'Old IGN', favouriteStudent: 'Old student', favouriteStudentId: 1, favouriteStudentImage: '/old.webp', favouriteStudentPortrait: '/oldportrait.webp', favouriteStudentMemorial: '/oldmemorial', favouriteStudentPortraitOffset: { x: 20 }, favouriteStudentMemorialOffset: { x: 30 }, score: 500, rank: 10 }, other] as const,
    roster: [{ id: 'player', ign: 'Old IGN', favouriteStudentImage: '/old.webp', totalEntries: 26 }],
    latestEntry: { playerId: 'player', playerName: 'Old IGN', score: 500 },
    leaders: [{ topPlayer: { playerId: 'player', name: 'Old IGN', score: 500 } }],
  }
  const result = applyPlayerIdentity(source, saved, now)
  assert.equal(result.entries[0].name, 'New IGN')
  assert.equal(result.entries[0].favouriteStudentImage, '/new.webp')
  assert.equal(result.entries[0].favouriteStudentPortrait, '/portrait.webp')
  assert.equal(result.entries[0].favouriteStudentMemorial, '/memorial.webm')
  assert.equal(result.entries[0].favouriteStudentPortraitOffset?.x, 7)
  assert.equal(result.entries[0].favouriteStudentMemorialOffset?.x, -7.6)
  assert.equal(result.entries[0].score, 500); assert.equal(result.entries[0].rank, 10)
  assert.equal(result.entries[1], other)
  assert.equal(result.roster[0].ign, 'New IGN')
  assert.equal(result.latestEntry.playerName, 'New IGN')
  assert.equal(result.leaders[0].topPlayer.name, 'New IGN')
})

test('expiry and missing browser records return cached public data without an override', () => {
  const source = { playerId: 'player', name: 'Public IGN', score: 500 }
  assert.equal(applyPlayerIdentity(source, null, now), source)
  assert.equal(applyPlayerIdentity(source, saved, saved.expiresAt), source)
  assert.equal(applyPlayerIdentity(source, saved, saved.expiresAt + 1), source)
})

test('a later confirmed save replaces the complete local identity snapshot', () => {
  const source = { id: 'player', ign: 'Old IGN', favouriteStudentId: 1 }
  const next = { ...saved, ign: 'Newest IGN', favouriteStudentData: { ...saved.favouriteStudentData!, id: 3 }, expiresAt: saved.expiresAt + 100 }
  assert.equal(applyPlayerIdentity(source, next, now).ign, 'Newest IGN')
  assert.equal(applyPlayerIdentity(source, next, now).favouriteStudentId, 3)
})
