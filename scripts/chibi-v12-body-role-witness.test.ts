import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  assertHanaeBodyRoleWitnessArtifacts,
  assertReviewedHanaeBodyRoleWitnessEvidence,
  assertReviewedHanaeBodyRoleWitnessMatchesProfile,
  HANAE_BODY_ROLE_WITNESS_FILE_PINS,
  readApprovedHanaeBodyRoleWitnessArtifacts,
  verifyApprovedHanaeBodyRoleWitness,
} from './chibi-v12-body-role-witness'
import { HANAE_BODY_ROLE_REVIEW_PINS } from './chibi-v12-body-role-review'
import { parseV12GlbBytes } from './chibi-v12-motion-glb'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FULL_GLB_PATH = String.raw`D:\Temp\stratonas-chibi-v12-full-acceptance-20260925-6d18e6c8\data\published\a6b416cf1f9a7b3dfcd257ca92c511ea7d2180f87f394aa1a54d5608b2787288\1182f8d3-d238-4db4-af1a-df4c7aa508e4.glb`

function changedByte(value: Buffer) {
  const copy = Buffer.from(value)
  copy[Math.floor(copy.length / 2)] ^= 0x01
  return copy
}

test('approved Hanae body-role witness binds the immutable full GLB, reviewed artifacts, and exact persisted profile', async () => {
  const fullGlbBytes = await readFile(FULL_GLB_PATH)
  const glb = parseV12GlbBytes(fullGlbBytes, HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256)
  const sceneIndex = Number.isInteger(glb.gltf.scene) ? glb.gltf.scene : 0
  const profile = glb.gltf.scenes[sceneIndex].extras.chibi.renderingProfile
  const artifacts = await readApprovedHanaeBodyRoleWitnessArtifacts(PROJECT_ROOT)
  assert.equal(assertHanaeBodyRoleWitnessArtifacts(artifacts), true)
  const evidence = await verifyApprovedHanaeBodyRoleWitness({
    projectRoot: PROJECT_ROOT,
    studentId: HANAE_BODY_ROLE_REVIEW_PINS.studentId,
    sourceIdentity: HANAE_BODY_ROLE_REVIEW_PINS.sourceIdentity,
    assetSha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256,
    fullGlbBytes,
  })
  assert.equal(evidence.measurement.height, 0.010476150575159772)
  assert.equal(evidence.measurement.vertexCount, 6927)
  assertReviewedHanaeBodyRoleWitnessEvidence(evidence, evidence.measurement.height, 'Fixture witness')
  assert.deepEqual(assertReviewedHanaeBodyRoleWitnessMatchesProfile({
    value: evidence,
    modelHeightUnits: evidence.measurement.height,
    studentId: HANAE_BODY_ROLE_REVIEW_PINS.studentId,
    sourceIdentity: HANAE_BODY_ROLE_REVIEW_PINS.sourceIdentity,
    assetSha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256,
    profile,
    glbJson: glb.gltf,
    verifiedWitness: evidence,
    label: 'Fixture witness',
  }), evidence)
})

test('witness consumption rejects byte changes to every pinned receipt, GLB, addendum, and screenshot', async () => {
  const artifacts = await readApprovedHanaeBodyRoleWitnessArtifacts(PROJECT_ROOT)
  const rejects = (changed: Parameters<typeof assertHanaeBodyRoleWitnessArtifacts>[0]) => {
    assert.throws(() => assertHanaeBodyRoleWitnessArtifacts(changed))
  }
  rejects({ ...artifacts, isolationReceipt: changedByte(artifacts.isolationReceipt) })
  rejects({ ...artifacts, isolatedGlb: changedByte(artifacts.isolatedGlb) })
  rejects({ ...artifacts, captureReceipt: changedByte(artifacts.captureReceipt) })
  rejects({ ...artifacts, reviewedAddendum: changedByte(artifacts.reviewedAddendum) })
  for (const index of HANAE_BODY_ROLE_WITNESS_FILE_PINS.screenshots.map((_, position) => position)) {
    const screenshots = [...artifacts.screenshots]
    screenshots[index] = changedByte(screenshots[index])
    rejects({ ...artifacts, screenshots })
  }
})

test('witness consumption fails closed on unreviewed or mismatched identities and measurements', async () => {
  const fullGlbBytes = await readFile(FULL_GLB_PATH)
  await assert.rejects(() => verifyApprovedHanaeBodyRoleWitness({
    projectRoot: PROJECT_ROOT, studentId: 23003, sourceIdentity: 'hanae_original',
    assetSha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256, fullGlbBytes,
  }), /different student/)
  await assert.rejects(() => verifyApprovedHanaeBodyRoleWitness({
    projectRoot: PROJECT_ROOT, studentId: 23002, sourceIdentity: 'other-source',
    assetSha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256, fullGlbBytes,
  }), /source identity differs/)
  await assert.rejects(() => verifyApprovedHanaeBodyRoleWitness({
    projectRoot: PROJECT_ROOT, studentId: 23002, sourceIdentity: 'hanae_original',
    assetSha256: '0'.repeat(64), fullGlbBytes,
  }), /asset revision differs/)

  const evidence = await verifyApprovedHanaeBodyRoleWitness({
    projectRoot: PROJECT_ROOT, studentId: 23002, sourceIdentity: 'hanae_original',
    assetSha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256, fullGlbBytes,
  })
  const altered = structuredClone(evidence)
  altered.measurement.height += 0.0001
  assert.throws(() => assertReviewedHanaeBodyRoleWitnessEvidence(altered, altered.measurement.height, 'Altered witness'), /measurement differs/)

  const glb = parseV12GlbBytes(fullGlbBytes, HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256)
  const sceneIndex = Number.isInteger(glb.gltf.scene) ? glb.gltf.scene : 0
  const profile = structuredClone(glb.gltf.scenes[sceneIndex].extras.chibi.renderingProfile)
  profile.renderers.push(structuredClone(profile.renderers.find((renderer: Record<string, any>) => renderer.sourceReference.objectId === '4488741340594890561')))
  assert.throws(() => assertReviewedHanaeBodyRoleWitnessMatchesProfile({
    value: evidence,
    modelHeightUnits: evidence.measurement.height,
    studentId: 23002,
    sourceIdentity: 'hanae_original',
    assetSha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256,
    profile,
    glbJson: glb.gltf,
    verifiedWitness: evidence,
    label: 'Duplicate profile renderer',
  }), /not unique in the persisted rendering profile/)
})

test('body-role witness import is inert and asset verification rejects a changed full GLB', async () => {
  const fullGlbBytes = await readFile(FULL_GLB_PATH)
  await assert.rejects(() => verifyApprovedHanaeBodyRoleWitness({
    projectRoot: PROJECT_ROOT,
    studentId: HANAE_BODY_ROLE_REVIEW_PINS.studentId,
    sourceIdentity: HANAE_BODY_ROLE_REVIEW_PINS.sourceIdentity,
    assetSha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256,
    fullGlbBytes: changedByte(fullGlbBytes),
  }), /GLB bytes differ from the immutable v12 checksum/)
})
