import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import * as THREE from 'three'
import ts from 'typescript'
import { mouthTileAtTime, mouthTileStateAtTime, mouthTileTextureTransform } from '@/lib/chibi-mouth'

const source = readFileSync(new URL('./ChibiViewer.tsx', import.meta.url), 'utf8')
const block = source.slice(source.indexOf('function setMouthTile('), source.indexOf('\nfunction addEyebrowCameraCorrection'))
const js = ts.transpileModule(`${block}; return setMouthTile`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const setMouth = new Function('mouthTileAtTime', 'mouthTileStateAtTime', 'mouthTileTextureTransform', js)(mouthTileAtTime, mouthTileStateAtTime, mouthTileTextureTransform)

function material() {
  const mouth = new THREE.MeshBasicMaterial({ map: new THREE.Texture() })
  mouth.userData = {
    mouthAtlas: { columns: 8, rows: 8, defaultTile: 601, scaleX: .5, scaleY: .5 },
    mouthTiles: {
      CH0242_Cafe_Idle: [[0, 602, true], [1, 201, false]],
      CH0242_Kneel_Attack_Start: [],
      reaction: [[.3, 201, false], [.8, 601, false]],
    },
  }
  return mouth
}

test('Hikari eventless attack uses the initial pose mouth without advancing its idle timeline', () => {
  const mouth = material()
  for (const time of [0, .65, 2, 0]) {
    setMouth(mouth, 'CH0242_Kneel_Attack_Start', time, 'CH0242_Cafe_Idle')
    const expected = mouthTileTextureTransform(602, true, 8, 8, .5, .5)
    assert.deepEqual(mouth.map!.offset.toArray(), expected.offset)
    assert.deepEqual(mouth.map!.repeat.toArray(), expected.repeat)
  }
})

test('authored mouth events, delayed events and reset-to-default retain their own expression', () => {
  const mouth = material()
  for (const [time, tile] of [[.1, 601], [.4, 201], [.9, 601]]) {
    setMouth(mouth, 'reaction', time, 'CH0242_Cafe_Idle')
    assert.deepEqual(mouth.map!.offset.toArray(), mouthTileTextureTransform(tile, false, 8, 8, .5, .5).offset)
  }
  setMouth(mouth, 'CH0242_Kneel_Attack_Start', .65, 'missing')
  assert.deepEqual(mouth.map!.offset.toArray(), mouthTileTextureTransform(601, false, 8, 8, .5, .5).offset)
})
