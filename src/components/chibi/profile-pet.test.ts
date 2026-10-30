import assert from 'node:assert/strict'
import test from 'node:test'
import { createProfilePet, profilePetWalkSpeed, stepProfilePet } from './profile-pet'
import { profileCafeClips } from './profile-figurine'

test('pet uses only exact cafe animations from its own source', () => {
  assert.deepEqual(profileCafeClips(['CH0001_Cafe_Idle', 'CH0284_Walk', 'CH0284_Cafe_Reaction_Random'], 'CH0284'), { idle: null, walk: null, reaction: null })
  assert.deepEqual(profileCafeClips(['CH0284_Cafe_Idle', 'CH0284_Cafe_Walk', 'CH0284_Cafe_Reaction'], 'CH0284'), { idle: 'CH0284_Cafe_Idle', walk: 'CH0284_Cafe_Walk', reaction: 'CH0284_Cafe_Reaction' })
})

test('pet walks left and right, stops at its target and idles', () => {
  const pet = createProfilePet(100)
  stepProfilePet(pet, 2, 300, 40, 0, () => 1)
  assert.equal(pet.phase, 'turn-out'); assert.equal(pet.direction, 1)
  stepProfilePet(pet, .2, 300, 40, 0)
  assert.equal(pet.x, 100); assert.ok(pet.angle > 0 && pet.angle < Math.PI / 2)
  stepProfilePet(pet, .2, 300, 40, 0)
  assert.equal(pet.phase, 'walk'); assert.equal(pet.angle, Math.PI / 2)
  stepProfilePet(pet, 1, 300, 40, 0)
  assert.equal(pet.x, 140)
  stepProfilePet(pet, 4, 300, 40, 0)
  assert.equal(pet.x, 300); assert.equal(pet.phase, 'turn-in')
  stepProfilePet(pet, .2, 300, 40, 0)
  assert.equal(pet.x, 300); assert.ok(pet.angle > 0 && pet.angle < Math.PI / 2)
  stepProfilePet(pet, .2, 300, 40, 0)
  assert.equal(pet.phase, 'idle'); assert.equal(pet.angle, 0)
  stepProfilePet(pet, 6, 300, 40, 0, () => 0)
  assert.equal(pet.phase, 'turn-out'); assert.equal(pet.direction, -1)
})

test('a reaction returns to idle and missing reactions are skipped', () => {
  const pet = createProfilePet(50)
  stepProfilePet(pet, 2, 300, 40, 3, () => 0)
  assert.equal(pet.phase, 'reaction')
  stepProfilePet(pet, 3, 300, 40, 3, () => 0)
  assert.equal(pet.phase, 'idle')
  stepProfilePet(pet, 1, 300, 40, 0, () => 0)
  assert.equal(pet.phase, 'turn-out')
})

test('falling accelerates from the drop point, lands exactly and never bounces', () => {
  const pet = createProfilePet(100, 300, 600)
  assert.equal(pet.phase, 'falling'); assert.equal(pet.y, 300)
  stepProfilePet(pet, .1, 300, 40, 0, Math.random, 600)
  assert.equal(pet.y, 306); assert.equal(pet.velocityY, 120)
  stepProfilePet(pet, .1, 300, 40, 0, Math.random, 600)
  assert.equal(pet.y, 324); assert.equal(pet.velocityY, 240)
  stepProfilePet(pet, 1, 300, 40, 0, Math.random, 600)
  assert.equal(pet.y, 600); assert.equal(pet.velocityY, 0); assert.equal(pet.phase, 'idle')
  stepProfilePet(pet, .1, 300, 40, 0, Math.random, 600)
  assert.equal(pet.y, 600)
})

test('walking speed uses the playground body-height ratio and scales with screen size', () => {
  assert.equal(profilePetWalkSpeed(150), 115)
  assert.equal(profilePetWalkSpeed(300), 230)
})

test('resize and narrow viewports keep pets within the screen', () => {
  const pet = createProfilePet(500)
  stepProfilePet(pet, 2, -50, 40, 0, () => 1)
  assert.equal(pet.x, 0); assert.equal(pet.target, 0); assert.equal(pet.phase, 'idle')
})
