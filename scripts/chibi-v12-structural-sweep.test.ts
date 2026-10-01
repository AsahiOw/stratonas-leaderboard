import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyStructuralFailure, collectStructuralSweepResults, parseSweepGlb } from './chibi-v12-structural-sweep'

const row = (studentId: number) => ({
  studentId,
  identityPath: `student_${studentId}`,
  sourceIdentity: `ch${studentId}`,
  assetId: `asset_${studentId}`,
  fileKey: `published/${studentId}.glb`,
  expectedSha256: 'a'.repeat(64),
  validation: {},
  actionProfile: {},
})

test('offline sweep catches each row failure and continues through the frozen roster inputs', async () => {
  const rows = await collectStructuralSweepResults([row(10001), row(10002), row(10003)], async input => {
    if (input.studentId === 10001) throw new Error('Student 10001 structural equipment renderer bundle:cab:123 authored action CH0182_Cafe_Walk has no relevant animation channel with a non-zero transform delta.')
    if (input.studentId === 10003) throw new Error('Student 10003 asset validation is not valid.')
  })
  assert.deepEqual(rows.map(result => result.status), ['failed', 'passed', 'failed'])
  assert.deepEqual(rows[0].failure, {
    category: 'structural-action-no-nonzero-delta',
    rendererSourceKey: 'bundle:cab:123',
    actionClip: 'CH0182_Cafe_Walk',
    message: 'Student 10001 structural equipment renderer bundle:cab:123 authored action CH0182_Cafe_Walk has no relevant animation channel with a non-zero transform delta.',
  })
  assert.equal(rows[2].failure?.category, 'character-contract')
})

test('offline sweep rejects duplicate student identities rather than hiding a roster collision', async () => {
  await assert.rejects(collectStructuralSweepResults([row(10001), row(10001)], () => {}), /repeats a student ID/)
})

test('structural failure classifier keeps action and renderer identity separate', () => {
  assert.deepEqual(
    classifyStructuralFailure('Student 10051 structural equipment renderer 814e:cab:117 authored action CH0182_Cafe_Walk has no relevant animation channel with a non-zero transform delta.'),
    { category: 'structural-action-no-nonzero-delta', rendererSourceKey: '814e:cab:117', actionClip: 'CH0182_Cafe_Walk' },
  )
})

test('GLB parser preserves binary sampler bytes for the acceptance movement assertion', () => {
  const json = Buffer.from(`${JSON.stringify({ asset: { version: '2.0' } })} `)
  while (json.length % 4 !== 0) json.fill(0x20, json.length)
  const binary = Buffer.from([1, 2, 3, 4])
  const totalLength = 12 + 8 + json.length + 8 + binary.length
  const glb = Buffer.alloc(totalLength)
  glb.write('glTF', 0, 'ascii')
  glb.writeUInt32LE(2, 4)
  glb.writeUInt32LE(totalLength, 8)
  glb.writeUInt32LE(json.length, 12)
  glb.writeUInt32LE(0x4e4f534a, 16)
  json.copy(glb, 20)
  const binaryHeader = 20 + json.length
  glb.writeUInt32LE(binary.length, binaryHeader)
  glb.writeUInt32LE(0x004e4942, binaryHeader + 4)
  binary.copy(glb, binaryHeader + 8)
  const parsed = parseSweepGlb(glb, 10001) as any
  assert.equal(parsed.asset.version, '2.0')
  assert.deepEqual([...parsed.__chibiBinary], [...binary])
})
