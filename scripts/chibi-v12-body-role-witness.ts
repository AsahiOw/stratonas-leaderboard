import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { HANAE_BODY_ROLE_REVIEW_PINS, createBodyIsolatedReviewArtifact } from './chibi-v12-body-role-review'
import { measureBindPoseBodyHeight, parseV12GlbBytes, type V12Glb } from './chibi-v12-motion-glb'
import type { SourceMotionModelHeightEvidenceV2, SourceMotionModelHeightMeasurementV2, SourceMotionReviewedBodyRoleWitnessV2 } from './chibi-v12-motion-proof-core'

export const HANAE_BODY_ROLE_WITNESS_FILE_PINS = {
  isolationReceipt: {
    path: String.raw`D:\Temp\chibi-v12-body-role-review-20260927-01\body-role-review-receipt.json`,
    sha256: '58a5c47f87be54e1e289c58a33b3b467b00e90efd0621d23548d9779c1fcaf2e',
  },
  isolatedGlb: {
    path: String.raw`D:\Temp\chibi-v12-body-role-review-20260927-01\hanae-body-isolated.glb`,
    sha256: 'ace8755034fda7719572dd198ba1fa9c5661dafe3554fd25dffdbd8f04684359',
  },
  captureReceipt: {
    path: String.raw`D:\Temp\chibi-v12-body-role-review-visual-20260927-02\capture-receipt.json`,
    sha256: 'ad70b6a47102e12571b136a448cbf30400ec0c84e34b143db2ac796365eca33c',
  },
  screenshots: [
    {
      name: 'full-idle-front.png',
      path: String.raw`D:\Temp\chibi-v12-body-role-review-visual-20260927-02\full-idle-front.png`,
      bytes: 62319,
      sha256: '095d333c0c559d29f91595dad77f1ab17fa27f87314e9baaac282fa809faaaa7',
    },
    {
      name: 'isolated-idle-front.png',
      path: String.raw`D:\Temp\chibi-v12-body-role-review-visual-20260927-02\isolated-idle-front.png`,
      bytes: 58834,
      sha256: 'f4aef2ada928a277b450ac85042f33d17a7efc2b3f833e69ae22df7182798229',
    },
    {
      name: 'paired-idle-front.png',
      path: String.raw`D:\Temp\chibi-v12-body-role-review-visual-20260927-02\paired-idle-front.png`,
      bytes: 119925,
      sha256: '3d739e3e0a2b3275e9a8e47a3021270bcc85fa3c8dd85c215c1b9fa49eba1627',
    },
  ],
  reviewedAddendum: {
    relativePath: path.join('docs', 'chibi-v12-hanae-body-role-visual-witness-20260927.md'),
    sha256: '31484f60dee87787600a68e835519edc0523a0d61b484d443c9dc7b0ff8a048a',
  },
} as const

export const HANAE_BODY_ROLE_WITNESS_MEASUREMENT: SourceMotionModelHeightMeasurementV2 = {
  minY: -0.000009719745195352641,
  maxY: 0.010466430829964419,
  height: 0.010476150575159772,
  vertexCount: 6927,
}

export type HanaeBodyRoleWitnessArtifacts = {
  isolationReceipt: Buffer
  isolatedGlb: Buffer
  captureReceipt: Buffer
  screenshots: readonly Buffer[]
  reviewedAddendum: Buffer
}

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

function parseJson(bytes: Buffer, label: string) {
  let value: unknown
  try {
    value = JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error(`${label} is not valid JSON.`)
  }
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be a JSON object.`)
  return value as Record<string, any>
}

function exactReference(actual: unknown, expected: { bundleSha256: string; serializedFile: string; objectId: string }, label: string) {
  assert.ok(actual && typeof actual === 'object' && !Array.isArray(actual), `${label} is missing.`)
  const reference = actual as Record<string, unknown>
  assert.deepEqual(
    { bundleSha256: reference.bundleSha256, serializedFile: reference.serializedFile, objectId: reference.objectId },
    expected,
    `${label} differs from the approved witness identity.`,
  )
}

function referenceKey(value: unknown, label: string) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} is missing.`)
  const reference = value as Record<string, unknown>
  assert.ok(typeof reference.bundleSha256 === 'string' && typeof reference.serializedFile === 'string' && typeof reference.objectId === 'string', `${label} is malformed.`)
  return `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}`
}

function expectedWitnessIdentity(): SourceMotionReviewedBodyRoleWitnessV2 {
  return {
    witnessId: 'chibi-v12-hanae-body-role-visual-witness-20260927',
    studentId: HANAE_BODY_ROLE_REVIEW_PINS.studentId,
    sourceIdentity: HANAE_BODY_ROLE_REVIEW_PINS.sourceIdentity,
    assetSha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256,
    sourcePrefabPath: HANAE_BODY_ROLE_REVIEW_PINS.prefabPath,
    sourceHierarchyPath: HANAE_BODY_ROLE_REVIEW_PINS.hierarchyPath,
    rendererType: HANAE_BODY_ROLE_REVIEW_PINS.rendererType,
    sourcePrefabReference: HANAE_BODY_ROLE_REVIEW_PINS.prefabReference,
    sourceRendererReference: HANAE_BODY_ROLE_REVIEW_PINS.rendererReference,
    sourceMeshReference: HANAE_BODY_ROLE_REVIEW_PINS.meshReference,
    sourceTransformChainReferences: [...HANAE_BODY_ROLE_REVIEW_PINS.rendererTransformChain],
    glbNodeIndex: HANAE_BODY_ROLE_REVIEW_PINS.targetNodeIndex,
    glbMeshIndex: HANAE_BODY_ROLE_REVIEW_PINS.targetMeshIndex,
    glbSkinIndex: HANAE_BODY_ROLE_REVIEW_PINS.targetSkinIndex,
    artifacts: {
      isolationReceiptSha256: HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolationReceipt.sha256,
      isolatedGlbSha256: HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolatedGlb.sha256,
      captureReceiptSha256: HANAE_BODY_ROLE_WITNESS_FILE_PINS.captureReceipt.sha256,
      fullScreenshotSha256: HANAE_BODY_ROLE_WITNESS_FILE_PINS.screenshots[0].sha256,
      isolatedScreenshotSha256: HANAE_BODY_ROLE_WITNESS_FILE_PINS.screenshots[1].sha256,
      pairedScreenshotSha256: HANAE_BODY_ROLE_WITNESS_FILE_PINS.screenshots[2].sha256,
      reviewedAddendumSha256: HANAE_BODY_ROLE_WITNESS_FILE_PINS.reviewedAddendum.sha256,
    },
  }
}

export function assertReviewedHanaeBodyRoleWitnessEvidence(
  value: unknown,
  modelHeightUnits: number,
  label: string,
): asserts value is Extract<SourceMotionModelHeightEvidenceV2, { selector: 'reviewed-isolated-glb-body-role-witness-v1' }> {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} modelHeightEvidence must be an object.`)
  const evidence = value as Record<string, any>
  assert.equal(evidence.selector, 'reviewed-isolated-glb-body-role-witness-v1', `${label} model-height selector is unsupported.`)
  assert.deepEqual(evidence.witness, expectedWitnessIdentity(), `${label} reviewed body-role witness identity or artifact pins differ.`)
  assert.deepEqual(evidence.measurement, HANAE_BODY_ROLE_WITNESS_MEASUREMENT, `${label} reviewed body-role measurement differs from the approved evidence.`)
  assert.equal(modelHeightUnits, HANAE_BODY_ROLE_WITNESS_MEASUREMENT.height, `${label} model height differs from the reviewed body measurement.`)
}

export function assertReviewedHanaeBodyRoleWitnessMatchesProfile(input: {
  value: unknown
  modelHeightUnits: number
  studentId: number
  sourceIdentity: string | null | undefined
  assetSha256: string | null | undefined
  profile: Record<string, any>
  glbJson: Record<string, any>
  verifiedWitness: Extract<SourceMotionModelHeightEvidenceV2, { selector: 'reviewed-isolated-glb-body-role-witness-v1' }>
  label: string
}) {
  assertReviewedHanaeBodyRoleWitnessEvidence(input.value, input.modelHeightUnits, input.label)
  const evidence = input.value as Extract<SourceMotionModelHeightEvidenceV2, { selector: 'reviewed-isolated-glb-body-role-witness-v1' }>
  const witness = evidence.witness
  assert.deepEqual(evidence, input.verifiedWitness, `${input.label} proof witness differs from the independently verified artifacts and GLB.`)
  assert.equal(witness.studentId, input.studentId, `${input.label} reviewed body-role witness belongs to another student.`)
  assert.equal(witness.sourceIdentity, input.sourceIdentity, `${input.label} reviewed body-role witness source differs from the persisted binding.`)
  assert.equal(witness.assetSha256.toLowerCase(), input.assetSha256?.toLowerCase(), `${input.label} reviewed body-role witness revision differs from the persisted asset.`)
  assert.equal(input.profile.sourceIdentity, witness.sourceIdentity, `${input.label} body-role witness differs from the embedded source identity.`)

  const sourcePrefab = input.profile.sourcePrefab
  const assembly = input.profile.assembly
  assert.ok(sourcePrefab && assembly, `${input.label} embedded profile has no exact prefab assembly.`)
  assert.equal(sourcePrefab.path, witness.sourcePrefabPath, `${input.label} body-role witness prefab path differs from the embedded profile.`)
  assert.equal(assembly.root, HANAE_BODY_ROLE_REVIEW_PINS.assemblyRoot, `${input.label} body-role witness assembly root differs from the embedded profile.`)
  assert.equal(referenceKey(sourcePrefab.reference, `${input.label} source-prefab reference`), referenceKey(witness.sourcePrefabReference, `${input.label} witness source-prefab reference`), `${input.label} body-role witness prefab reference differs from the profile.`)
  assert.equal(referenceKey(assembly.prefabReference, `${input.label} assembly prefab reference`), referenceKey(witness.sourcePrefabReference, `${input.label} witness assembly prefab reference`), `${input.label} body-role witness prefab differs from the selected assembly.`)

  const renderers = Array.isArray(input.profile.renderers) ? input.profile.renderers : []
  const rendererRows = renderers.filter((renderer: Record<string, any>) => referenceKey(renderer.sourceReference, `${input.label} profile renderer reference`) === referenceKey(witness.sourceRendererReference, `${input.label} witness renderer reference`))
  assert.equal(rendererRows.length, 1, `${input.label} witness renderer is not unique in the persisted rendering profile.`)
  const renderer = rendererRows[0]
  const rendererMeshReference = renderer.sourceMesh?.sourceReference ?? renderer.sourceMeshReference
  assert.equal(referenceKey(rendererMeshReference, `${input.label} profile renderer mesh`), referenceKey(witness.sourceMeshReference, `${input.label} witness mesh reference`), `${input.label} body-role witness mesh differs from the profile renderer.`)
  assert.equal(renderer.rendererType, witness.rendererType, `${input.label} body-role witness renderer type differs from the profile.`)
  assert.equal(renderer.defaultVisible, true, `${input.label} body-role witness renderer is not visible by default.`)
  assert.equal(renderer.hierarchyPath, witness.sourceHierarchyPath, `${input.label} body-role witness hierarchy path differs from the profile.`)
  assert.equal(renderer.glbNodeIndex, witness.glbNodeIndex, `${input.label} body-role witness GLB node differs from the profile renderer.`)

  const assemblyRenderers = Array.isArray(assembly.renderers) ? assembly.renderers : []
  const assemblyRows = assemblyRenderers.filter((candidate: Record<string, any>) => referenceKey(candidate.sourceReference, `${input.label} assembly renderer reference`) === referenceKey(witness.sourceRendererReference, `${input.label} witness renderer reference`))
  assert.equal(assemblyRows.length, 1, `${input.label} witness renderer is not unique in the persisted assembly.`)
  const assemblyRenderer = assemblyRows[0]
  assert.equal(referenceKey(assemblyRenderer.meshSourceReference, `${input.label} assembly renderer mesh`), referenceKey(witness.sourceMeshReference, `${input.label} witness assembly mesh`), `${input.label} witness mesh differs from the exact assembly renderer.`)
  assert.deepEqual((assemblyRenderer.transformChain as Record<string, any>[]).map(pointer => pointer.sourceReference), witness.sourceTransformChainReferences, `${input.label} witness Transform chain differs from the exact assembly renderer.`)

  const node = input.glbJson.nodes?.[witness.glbNodeIndex]
  assert.ok(node, `${input.label} witness GLB node is missing.`)
  assert.equal(node.mesh, witness.glbMeshIndex, `${input.label} witness mesh index differs from the selected GLB node.`)
  assert.equal(node.skin, witness.glbSkinIndex, `${input.label} witness skin index differs from the selected GLB node.`)
  const nodeSource = node.extras?.chibi?.sourceRenderer
  assert.equal(referenceKey(nodeSource?.sourceReference, `${input.label} GLB node renderer source`), referenceKey(witness.sourceRendererReference, `${input.label} witness GLB renderer`), `${input.label} GLB node renderer provenance differs from the witness.`)
  assert.equal(referenceKey(nodeSource?.sourceMeshReference, `${input.label} GLB node mesh source`), referenceKey(witness.sourceMeshReference, `${input.label} witness GLB mesh`), `${input.label} GLB node mesh provenance differs from the witness.`)
  assert.ok(input.glbJson.skins?.[witness.glbSkinIndex], `${input.label} witness GLB skin is missing.`)
  return evidence
}

export function assertHanaeBodyRoleWitnessArtifacts(artifacts: HanaeBodyRoleWitnessArtifacts) {
  assert.equal(sha256(artifacts.isolationReceipt), HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolationReceipt.sha256, 'Isolation receipt bytes differ from the reviewed pin.')
  assert.equal(sha256(artifacts.isolatedGlb), HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolatedGlb.sha256, 'Isolated GLB bytes differ from the reviewed pin.')
  assert.equal(sha256(artifacts.captureReceipt), HANAE_BODY_ROLE_WITNESS_FILE_PINS.captureReceipt.sha256, 'Capture receipt bytes differ from the reviewed pin.')
  assert.equal(sha256(artifacts.reviewedAddendum), HANAE_BODY_ROLE_WITNESS_FILE_PINS.reviewedAddendum.sha256, 'Lead-reviewed addendum bytes differ from the frozen pin.')
  assert.equal(artifacts.screenshots.length, HANAE_BODY_ROLE_WITNESS_FILE_PINS.screenshots.length, 'Screenshot count differs from the reviewed capture.')
  for (const [index, pin] of HANAE_BODY_ROLE_WITNESS_FILE_PINS.screenshots.entries()) {
    const bytes = artifacts.screenshots[index]
    assert.ok(Buffer.isBuffer(bytes), `Reviewed screenshot ${pin.name} is missing.`)
    assert.equal(bytes.length, pin.bytes, `Reviewed screenshot ${pin.name} byte count differs.`)
    assert.equal(sha256(bytes), pin.sha256, `Reviewed screenshot ${pin.name} bytes differ from the pinned capture.`)
  }

  const isolation = parseJson(artifacts.isolationReceipt, 'Isolation receipt')
  assert.equal(isolation.kind, 'chibi-v12-isolated-body-role-review', 'Isolation receipt kind is unsupported.')
  assert.equal(isolation.status, 'pending-lead-visual-review', 'Isolation receipt must retain its pre-review status; approval is pinned separately by the addendum.')
  assert.equal(isolation.studentId, HANAE_BODY_ROLE_REVIEW_PINS.studentId)
  assert.equal(isolation.sourceIdentity, HANAE_BODY_ROLE_REVIEW_PINS.sourceIdentity)
  assert.deepEqual(isolation.originalGlb, { sha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256, bytes: 3749584 })
  assert.deepEqual(isolation.isolatedGlb, { sha256: HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolatedGlb.sha256, bytes: 3749504 })
  const binding = isolation.exactEmbeddedBinding
  assert.ok(binding && typeof binding === 'object', 'Isolation receipt has no exact embedded binding.')
  exactReference(binding.sourcePrefabReference, HANAE_BODY_ROLE_REVIEW_PINS.prefabReference, 'Isolation source prefab')
  exactReference(binding.sourceRendererReference, HANAE_BODY_ROLE_REVIEW_PINS.rendererReference, 'Isolation source renderer')
  exactReference(binding.sourceMeshReference, HANAE_BODY_ROLE_REVIEW_PINS.meshReference, 'Isolation source mesh')
  assert.deepEqual(binding.sourceTransformChain, HANAE_BODY_ROLE_REVIEW_PINS.rendererTransformChain)
  assert.equal(binding.sourceHierarchyPath, HANAE_BODY_ROLE_REVIEW_PINS.hierarchyPath)
  assert.equal(binding.sourceRendererType, HANAE_BODY_ROLE_REVIEW_PINS.rendererType)
  assert.equal(binding.glbNodeIndex, HANAE_BODY_ROLE_REVIEW_PINS.targetNodeIndex)
  assert.equal(binding.glbMeshIndex, HANAE_BODY_ROLE_REVIEW_PINS.targetMeshIndex)
  assert.equal(binding.glbSkinIndex, HANAE_BODY_ROLE_REVIEW_PINS.targetSkinIndex)
  assert.deepEqual(isolation.bindPoseHeight, {
    ...HANAE_BODY_ROLE_WITNESS_MEASUREMENT,
    nodeIndices: [HANAE_BODY_ROLE_REVIEW_PINS.targetNodeIndex],
    method: 'measureBindPoseBodyHeight from the pinned immutable GLB skinned vertices',
    units: 'GLB model-space units',
  })
  assert.deepEqual(isolation.changeSummary, {
    changedNodeFields: ['mesh', 'skin'],
    selectedNodeUnchanged: true,
    materialsTexturesAnimationsHierarchyAccessorsAndBinaryRetained: true,
  })
  assert.deepEqual(isolation.hiddenMeshNodes.map((node: Record<string, unknown>) => node.nodeIndex), [179, 180, 181, 192, 194])

  const capture = parseJson(artifacts.captureReceipt, 'Visual capture receipt')
  assert.equal(capture.status, 'captured-pending-human-review', 'Capture receipt status differs from the reviewed capture.')
  assert.equal(capture.studentId, HANAE_BODY_ROLE_REVIEW_PINS.studentId)
  assert.equal(capture.origin, 'http://localhost:3137')
  assert.equal(capture.publishedRevisionSha256, HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256)
  assert.equal(capture.isolatedSha256, HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolatedGlb.sha256)
  assert.equal(capture.chrome?.browserVersion, 'Chrome/152.0.7977.42')
  assert.equal(capture.chrome?.sha256, 'b3b221d637b5b6a745c51cac1d22a618e7da5e67202be52695999886720c7d56')
  assert.deepEqual(capture.browserResponses, [
    { variant: 'full', status: 200, sha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256 },
    { variant: 'isolated', status: 200, sha256: HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolatedGlb.sha256 },
  ])
  assert.deepEqual(capture.files, HANAE_BODY_ROLE_WITNESS_FILE_PINS.screenshots.map(({ name, bytes, sha256 }) => ({ name, byteLength: bytes, sha256 })))
  assert.deepEqual(capture.pageErrors, [])
  assert.match(artifacts.reviewedAddendum.toString('utf8'), /^# Hanae v12 narrow body-role visual witness\r?\n\r?\nStatus: lead-reviewed/m)
  return true
}

export async function readApprovedHanaeBodyRoleWitnessArtifacts(projectRoot: string): Promise<HanaeBodyRoleWitnessArtifacts> {
  const readPinned = async (file: string, expectedSha256: string, label: string) => {
    const before = await lstat(file)
    assert.ok(before.isFile() && !before.isSymbolicLink() && before.nlink <= 1, `${label} must be a private regular file.`)
    assert.equal((await realpath(file)).toLowerCase(), path.resolve(file).toLowerCase(), `${label} resolves through a path alias.`)
    const bytes = await readFile(file)
    const after = await lstat(file)
    assert.ok(after.isFile() && !after.isSymbolicLink() && after.nlink <= 1, `${label} changed type while being read.`)
    assert.equal(after.size, bytes.length, `${label} changed size while being read.`)
    assert.equal(after.mtimeMs, before.mtimeMs, `${label} changed while being read.`)
    assert.equal(sha256(bytes), expectedSha256, `${label} bytes differ from the reviewed pin.`)
    return bytes
  }
  const artifacts: HanaeBodyRoleWitnessArtifacts = {
    isolationReceipt: await readPinned(HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolationReceipt.path, HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolationReceipt.sha256, 'Isolation receipt'),
    isolatedGlb: await readPinned(HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolatedGlb.path, HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolatedGlb.sha256, 'Isolated GLB'),
    captureReceipt: await readPinned(HANAE_BODY_ROLE_WITNESS_FILE_PINS.captureReceipt.path, HANAE_BODY_ROLE_WITNESS_FILE_PINS.captureReceipt.sha256, 'Capture receipt'),
    screenshots: await Promise.all(HANAE_BODY_ROLE_WITNESS_FILE_PINS.screenshots.map(pin => readPinned(pin.path, pin.sha256, `Capture screenshot ${pin.name}`))),
    reviewedAddendum: await readPinned(path.resolve(projectRoot, HANAE_BODY_ROLE_WITNESS_FILE_PINS.reviewedAddendum.relativePath), HANAE_BODY_ROLE_WITNESS_FILE_PINS.reviewedAddendum.sha256, 'Lead-reviewed body-role addendum'),
  }
  assertHanaeBodyRoleWitnessArtifacts(artifacts)
  return artifacts
}

export async function verifyApprovedHanaeBodyRoleWitness(input: {
  projectRoot: string
  studentId: number
  sourceIdentity: string | null | undefined
  assetSha256: string
  fullGlbBytes: Buffer
}): Promise<Extract<SourceMotionModelHeightEvidenceV2, { selector: 'reviewed-isolated-glb-body-role-witness-v1' }>> {
  assert.equal(input.studentId, HANAE_BODY_ROLE_REVIEW_PINS.studentId, 'Reviewed body-role witness is for a different student.')
  assert.equal(input.sourceIdentity, HANAE_BODY_ROLE_REVIEW_PINS.sourceIdentity, 'Reviewed body-role witness source identity differs.')
  assert.equal(input.assetSha256.toLowerCase(), HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256, 'Reviewed body-role witness asset revision differs.')
  const fullGlb: V12Glb = parseV12GlbBytes(input.fullGlbBytes, HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256)
  const artifacts = await readApprovedHanaeBodyRoleWitnessArtifacts(input.projectRoot)
  const regenerated = createBodyIsolatedReviewArtifact(fullGlb, HANAE_BODY_ROLE_REVIEW_PINS)
  assert.deepEqual(regenerated.bytes, artifacts.isolatedGlb, 'Isolated GLB does not match a fresh exact mesh/skin-only isolation of the published GLB.')
  assert.equal(sha256(regenerated.bytes), HANAE_BODY_ROLE_WITNESS_FILE_PINS.isolatedGlb.sha256, 'Regenerated isolated GLB differs from the approved artifact digest.')
  const measurement = measureBindPoseBodyHeight(fullGlb, [HANAE_BODY_ROLE_REVIEW_PINS.targetNodeIndex])
  assert.deepEqual(measurement, HANAE_BODY_ROLE_WITNESS_MEASUREMENT, 'Measured body height from the full published GLB differs from the reviewed denominator.')
  const evidence: SourceMotionModelHeightEvidenceV2 = {
    selector: 'reviewed-isolated-glb-body-role-witness-v1',
    witness: expectedWitnessIdentity(),
    measurement,
  }
  assertReviewedHanaeBodyRoleWitnessEvidence(evidence, measurement.height, 'Computed Hanae body-role witness')
  return evidence
}
