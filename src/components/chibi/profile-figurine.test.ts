import assert from 'node:assert/strict'
import test from 'node:test'
import { formationIdleClips, formationPickupClip } from './profile-figurine'

test('pickup matches only the selected source formation pickup', () => {
  assert.equal(formationPickupClip(['CH0001_Formation_Pickup', 'CH0284_Pickup', 'CH0284_Formation_Pickup_Random'], 'CH0284'), null)
  assert.equal(formationPickupClip(['CH0284_Formation_Pickup'], 'CH0284'), 'CH0284_Formation_Pickup')
  assert.equal(formationPickupClip(['formation_pickup'], 'CH0284'), 'formation_pickup')
})

test('selects the exact source formation idle, regardless of catalog order', () => {
  assert.deepEqual(formationIdleClips(['CH0284_Cafe_Idle', 'CH0284_Formation_Idle_Random', 'CH0284_Formation_Idle'], 'ch0284'), {
    idle: 'CH0284_Formation_Idle', random: 'CH0284_Formation_Idle_Random',
  })
})

test('does not substitute another character, a variant suffix, or cafe idle', () => {
  assert.deepEqual(formationIdleClips(['CH0001_Formation_Idle', 'CH0284_Formation_Idle_Random2', 'CH0284_Cafe_Idle'], 'ch0284'), { idle: null, random: null })
})

test('handles a single idle, a random-only clip, and unprefixed source names', () => {
  assert.deepEqual(formationIdleClips(['CH0284_Formation_Idle'], 'ch0284'), { idle: 'CH0284_Formation_Idle', random: null })
  assert.deepEqual(formationIdleClips(['CH0284_Formation_Idle_Random'], 'ch0284'), { idle: null, random: 'CH0284_Formation_Idle_Random' })
  assert.deepEqual(formationIdleClips(['formation_idle', 'formation_idle_random'], 'ch0284'), { idle: 'formation_idle', random: 'formation_idle_random' })
})
