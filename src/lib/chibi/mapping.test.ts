import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultProfile, mapStudentToSources } from './mapping'
import type { SourceCandidate } from './inventory'

const source = (sourceIdentity: string, fingerprint = 'v1'): SourceCandidate => ({ sourceIdentity, fingerprint, conflict: false, parts: [], families: [], revisions: [], clips: [], objectNames: [], materials: [], dependencies: [], events: [] })

test('canonical mapping is exact and display-name changes do not affect it', () => {
  const result = mapStudentToSources({ id: 10002, name: 'Changed display name', pathName: 'haruna' }, [source('haruna_original')])
  assert.equal(result.status, 'mapped')
})

test('canonical mapping prefers SchaleDB developer identity and falls back to path name', () => {
  const numeric = mapStudentToSources({ id: 10059, name: 'Mika', pathName: 'mika', devName: 'CH0069' }, [source('ch0069')])
  assert.equal(numeric.status, 'mapped')
  if (numeric.status === 'mapped') assert.equal(numeric.source.sourceIdentity, 'ch0069')

  const legacy = mapStudentToSources({ id: 10003, name: 'Hifumi', pathName: 'hifumi', devName: 'Hihumi' }, [source('hihumi_original')])
  assert.equal(legacy.status, 'mapped')
  if (legacy.status === 'mapped') assert.equal(legacy.source.sourceIdentity, 'hihumi_original')
})

test('canonical mapping covers the reviewed Reijo source transliteration', () => {
  const result = mapStudentToSources({ id: 10104, name: 'Reijo', pathName: 'reijo', devName: 'CH0134' }, [source('reizyo_original')])
  assert.equal(result.status, 'mapped')
  if (result.status === 'mapped') assert.equal(result.source.sourceIdentity, 'reizyo_original')
})

test('canonical mapping covers Shiroko cycling under the source RidingSuit name', () => {
  const result = mapStudentToSources({ id: 10024, name: 'Shiroko (Cycling)', pathName: 'shiroko_cycling', devName: 'CH0065' }, [source('shiroko_ridingsuit')])
  assert.equal(result.status, 'mapped')
  if (result.status === 'mapped') assert.equal(result.source.sourceIdentity, 'shiroko_ridingsuit')
})

test('canonical mapping skips Natsu\'s clip-only named candidate', () => {
  const result = mapStudentToSources({ id: 10029, name: 'Natsu', pathName: 'natsu', devName: 'CH0155' }, [source('natsu_original'), source('ch0155')])
  assert.equal(result.status, 'mapped')
  if (result.status === 'mapped') assert.equal(result.source.sourceIdentity, 'ch0155')
})

test('canonical mapping uses Wakamo swimsuit\'s authoritative numeric source', () => {
  const result = mapStudentToSources({ id: 10043, name: 'Wakamo (Swimsuit)', pathName: 'wakamo_swimsuit', devName: 'CH0175' }, [source('wakamo_swimsuit_original'), source('ch0175')])
  assert.equal(result.status, 'mapped')
  if (result.status === 'mapped') assert.equal(result.source.sourceIdentity, 'ch0175')
})

test('Haruna keeps the corrected original source when a legacy identity is also indexed', () => {
  const result = mapStudentToSources({ id: 10002, name: 'Haruna', pathName: 'haruna' }, [source('haruna'), source('haruna_original')])
  assert.equal(result.status, 'mapped')
  if (result.status === 'mapped') assert.equal(result.source.sourceIdentity, 'haruna_original')
})

test('manual override survives name changes and selects distinct duplicate-name variants', () => {
  const selected = source('shunling_swimsuit')
  const binding = { sourceIdentity: null, identityPath: null, provenance: 'manual', profile: {}, overrides: { sourceIdentity: selected.sourceIdentity, identityPath: 'shunling_swimsuit', approvedCandidateFingerprint: 'v1' } }
  const result = mapStudentToSources({ id: 10144, name: 'Shun (Swimsuit)', pathName: 'shunling_swimsuit' }, [source('shun_swimsuit'), selected], binding)
  assert.equal(result.status, 'mapped')
  if (result.status === 'mapped') assert.equal(result.source.sourceIdentity, 'shunling_swimsuit')
})

test('manual approval requires review after source or identity path changes', () => {
  const binding = { sourceIdentity: null, identityPath: null, provenance: 'manual', profile: {}, overrides: { sourceIdentity: 'hoshino_battle_tank', identityPath: 'hoshino_battle_tank', approvedCandidateFingerprint: 'old' } }
  assert.equal(mapStudentToSources({ id: 10098, name: 'Hoshino', pathName: 'hoshino_battle_tank' }, [source('hoshino_battle_tank', 'new')], binding).status, 'review-required')
  assert.equal(mapStudentToSources({ id: 10098, name: 'Hoshino', pathName: 'changed' }, [source('hoshino_battle_tank', 'old')], binding).status, 'review-required')
})

test('default profile ignores shared dependency clips from another character', () => {
  const profile = defaultProfile({
    ...source('iori_original'),
    clips: [
      'Hasumi_Original_Cafe_Idle', 'Hasumi_Original_Cafe_Walk', 'Hasumi_Original_Formation_Pickup',
      'Iori_Original_Cafe_Idle', 'Iori_Original_Cafe_Walk', 'Iori_Original_Formation_Pickup',
    ],
  })
  assert.equal(profile.interactions.idle.clip, 'Iori_Original_Cafe_Idle')
  assert.equal(profile.interactions.walk.clip, 'Iori_Original_Cafe_Walk')
  assert.equal(profile.interactions.pickup.clip, 'Iori_Original_Formation_Pickup')
})

test('default profile prefers the direct pickup clip when source separators vary', () => {
  const profile = defaultProfile({
    ...source('hanae_original'),
    clips: [
      'Hanae_Original_Rabbit_Formation_Pickup',
      'Hanae_Original_Formation Pickup',
    ],
  })
  assert.equal(profile.interactions.pickup.clip, 'Hanae_Original_Formation Pickup')
  assert.equal(defaultProfile({ ...source('hanae_original'), clips: ['Hanae_Original_Rabbit_Formation_Pickup'] })
    .interactions.pickup.clip, 'Hanae_Original_Rabbit_Formation_Pickup')
})

test('default profile does not borrow base-outfit clips for a swimsuit source', () => {
  const profile = defaultProfile({
    ...source('wakamo_swimsuit_original'),
    clips: ['Wakamo_Original_Cafe_Idle', 'Wakamo_Original_Cafe_Walk', 'Wakamo_Original_Formation_Pickup'],
  })
  assert.equal(profile.initialPose, null)
  assert.equal(profile.interactions.idle.state, 'unresolved')
  assert.equal(profile.interactions.walk.state, 'unresolved')
  assert.equal(profile.interactions.pickup.state, 'unresolved')
})
