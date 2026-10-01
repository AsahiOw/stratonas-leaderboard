import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import { candidateClips, readImportInput, readProfile } from './api-input'
import { artifactPath } from './storage'
import { emptyChibiProfile, isEligibleStudentId } from './types'

test('eligibility uses integer boundaries and excludes custom identities', () => {
  for (const id of [10000, 10002, 99999]) assert.equal(isEligibleStudentId(id), true)
  for (const id of [0, 9999, 100000, 10002.5, '10002', null, NaN]) assert.equal(isEligibleStudentId(id), false)
})
test('import input rejects invalid modes and unbounded force rebuilds', () => {
  assert.deepEqual(readImportInput({ mode: 'update' }), { mode: 'update', studentIds: [] })
  assert.deepEqual(readImportInput({ mode: 'force-rebuild', studentIds: [10002, 10002, 10143] }).studentIds, [10002, 10143])
  for (const input of [null, [], { mode: 'delete' }, { mode: 'force-rebuild' }, { mode: 'update', studentIds: [9999] }]) assert.throws(() => readImportInput(input))
})
test('reviewed interactions require exact source clips and explicit missing-state reasons', () => {
  const profile = emptyChibiProfile('Own outfit')
  profile.initialPose = 'Own_Idle'
  profile.interactions.idle = { state: 'available', clip: 'Own_Idle', speed: 1 }
  profile.interactions.touch = { state: 'unsupported', reason: 'No touch clip in this outfit.' }
  const approved = readProfile(profile, ['Own_Idle'])
  assert.equal(approved.interactions.idle.loop, true)
  assert.equal(approved.interactions.touch.state, 'unsupported')
  assert.throws(() => readProfile(profile, ['Other_Idle']))
  profile.interactions.touch.reason = ''
  assert.throws(() => readProfile(profile, ['Own_Idle']))
})
test('pickup holds and touch plays once even if supplied looping flags request otherwise', () => {
  const profile = emptyChibiProfile()
  profile.interactions.pickup = { state: 'available', clip: 'Pickup', loop: true, hold: false }
  profile.interactions.touch = { state: 'available', clip: 'Touch', loop: true, hold: true }
  const result = readProfile(profile, ['Pickup', 'Touch'])
  assert.equal(result.interactions.pickup.loop, false)
  assert.equal(result.interactions.pickup.hold, true)
  assert.equal(result.interactions.touch.hold, false)
  for (const speed of [0, -1, 5, NaN]) {
    profile.interactions.pickup.speed = speed
    assert.throws(() => readProfile(profile, ['Pickup', 'Touch']))
  }
})
test('candidate clips tolerate only indexed string or named entries', () => {
  assert.deepEqual(candidateClips({ clips: ['Idle', { name: 'Walk' }, null, 42] }), ['Idle', 'Walk'])
})
test('relative storage keys work with spaces and reject traversal or foreign absolute paths', () => {
  const root = path.resolve('Development_data', 'a path with spaces')
  assert.equal(artifactPath('published/a/model.glb', root), path.join(root, 'published', 'a', 'model.glb'))
  for (const key of ['', '../secret', '/etc/passwd', 'C:/secret', 'C:\\secret', 'a\\..\\b', 'a/../b', 'a//b', 'a/./b', 'a/\0']) assert.throws(() => artifactPath(key, root))
})
