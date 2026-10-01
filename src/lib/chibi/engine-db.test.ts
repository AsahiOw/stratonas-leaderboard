import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { performance } from 'node:perf_hooks'
import test from 'node:test'

import { annotateProjectMxSourceMeshEvidence, buildFingerprint, CHIBI_CORE_CONVERTER_VERSION, CHIBI_EXPORTER_VERSION, CHIBI_MATERIAL_VERSION, selectAnimator } from './engine'
import { fencedPublish, processJob } from './engine-db'
import { defaultProfile } from './mapping'
import type { InventoryReport, SourceCandidate } from './inventory'
import { buildChibiRenderingProfile, CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES, CHIBI_SHADER_ADAPTER_VERSION } from './rendering-profile'
import { assertMetadataOnlyGlbRewrite, buildCoreFingerprint, buildPinnedV12Fingerprint, CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION, effectiveClipSelection, PINNED_V12_EXPORTER_VERSION, rewriteGlbDiagnostics } from './core-cache'

const TEST_CORE_CONVERTER_IDENTITY = `toolchain-v1:${'f'.repeat(64)}`
const testCoreConverterVersion = `${CHIBI_CORE_CONVERTER_VERSION};exporter=${CHIBI_EXPORTER_VERSION};toolchain=${TEST_CORE_CONVERTER_IDENTITY}`

async function processTestJob(db: any, job: any, report: InventoryReport, options: NonNullable<Parameters<typeof processJob>[3]> = {}) {
  return processJob(db, job, report, { coreConverterIdentity: async () => TEST_CORE_CONVERTER_IDENTITY, ...options })
}

const sourceReference = (bundleSha256: string, serializedFile: string, objectId: string) => ({ bundleSha256, serializedFile, objectId })
const prefabPath = 'Assets/_MX/AddressableAsset/Character/A/A.prefab'
const prefabBundle = 'a'.repeat(64), materialBundle = 'b'.repeat(64), shaderBundle = 'c'.repeat(64), textureBundle = 'd'.repeat(64)
const rendererReference = sourceReference(prefabBundle, 'CAB-prefab', '3')
const materialReference = sourceReference(materialBundle, 'CAB-materials', '5')
const shaderReference = sourceReference(shaderBundle, 'CAB-shaders', '7')
const textureReference = sourceReference(textureBundle, 'CAB-textures', '9')
const shader = {
  name: '', parsedName: 'MX/C-EyesMouth', pathId: '7', file: 'CAB-shaders', sourceReference: shaderReference,
  programBlobSha256: 'e'.repeat(64), properties: { m_Props: [] },
  subShaders: [{ passes: [{ type: 0, state: { srcBlend: 5, dstBlend: 10, zWrite: 1, zTest: 4, culling: 2, offsetFactor: 0, offsetUnits: 0 } }] }],
}
const material = {
  name: 'A_EyeMouth', pathId: '5', file: 'CAB-materials', sourceReference: materialReference,
  shader: { file: 'CAB-shaders', pathId: '7' }, shaderReference, shaderName: '', shaderParsedName: 'MX/C-EyesMouth',
  renderQueue: 2001, keywords: [], floatProperties: { _MouthTileCols: 8, _MouthTileRows: 8 }, intProperties: {}, colorProperties: {},
  textures: [{ name: '_MouthTileTex', texture: { file: 'CAB-textures', pathId: '9' }, textureReference, scale: { x: 0.5, y: 0.5 }, offset: { x: 0.5, y: 0.875 } }],
  resolvedTextures: [{ property: '_MouthTileTex', name: 'Character_Mouth', width: 1, height: 1, sourceReference: textureReference, scale: { x: 0.5, y: 0.5 }, offset: { x: 0.5, y: 0.875 } }],
}
const candidate: SourceCandidate = {
  sourceIdentity: 'a', fingerprint: 'e'.repeat(64), conflict: false, parts: [], families: [], revisions: [], clips: [],
  objectNames: [], materials: ['A_EyeMouth'], dependencies: [], events: [],
  materialMetadata: [material], sourceMaterials: [material], shaders: [shader],
  prefabPaths: [prefabPath],
  assembly: [{
    root: 'A', prefabPath, prefabTarget: { file: 'CAB-prefab', pathId: '1' }, prefabReference: sourceReference(prefabBundle, 'CAB-prefab', '1'),
    rendererOrder: ['A_Body'],
    renderers: [{
      name: 'A_Body', pathId: '3', sourceReference: rendererReference, rendererType: 'SkinnedMeshRenderer', hierarchyPath: 'A/A_Body',
      enabled: true, gameObjectActive: true, visible: true, mesh: { file: 'CAB-mesh', pathId: '4' },
      meshSourceReference: sourceReference(prefabBundle, 'CAB-mesh', '4'),
      materialSlots: [{ slot: 0, material: { file: 'CAB-materials', pathId: '5' }, sourceMaterialReference: materialReference }],
    }],
    attachments: { mouthRenderer: [{ file: 'CAB-prefab', pathId: '3', name: 'A_Body' }], mouthMaterialIndex: 0, mouthDefaultUV: { x: 0.125, y: 0.625 } },
  }],
}

function tinyGlb(renderingProfile?: any) {
  const document = {
    asset: { version: '2.0', generator: 'FBX2glTF v0.13.1' }, buffers: [{ byteLength: 12 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }], accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: 'VEC3' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], skins: [{ joints: [0] }], nodes: [{ name: 'joint' }, { mesh: 0, skin: 0 }],
    scenes: [{ nodes: [1], ...(renderingProfile ? { extras: { chibi: {
      renderingProfile,
      renderingProfileDiagnostics: {
        schemaVersion: 1, policyVersion: renderingProfile.policyVersion,
        intentionallyExcludedRenderers: [], excludedChildRendererEvents: [], unprofiledGeometry: [],
        ...(Array.isArray(renderingProfile.fxExclusionProofs) ? { fxExclusionProofs: renderingProfile.fxExclusionProofs } : {}),
        ...(Array.isArray(renderingProfile.excludedFxInstantiationEvents)
          ? { excludedFxInstantiationEvents: renderingProfile.excludedFxInstantiationEvents } : {}),
      },
    } } } : {}) }], scene: 0,
  }
  const source = Buffer.from(JSON.stringify(document)), json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)]), binary = Buffer.alloc(12)
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length)
  output.write('glTF'); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8)
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20)
  const offset = 20 + json.length; output.writeUInt32LE(binary.length, offset); output.writeUInt32LE(0x004e4942, offset + 4); binary.copy(output, offset + 8)
  return output
}

function fakeDatabase(asset: any, binding: any, student: any = { id: 10003, name: 'A', pathName: 'a' }) {
  const jobs = new Map<string, any>()
  const items: any[] = []
  const students = Array.isArray(student) ? student : [student]
  const studentById = new Map(students.map((row: any) => [row.id, row]))
  const bindings = new Map(students.map((row: any) => [row.id, typeof binding === 'function' ? binding(row) : binding]))
  const assets = asset ? [asset] : []
  const db: any = {
    $transaction: async (input: any) => Array.isArray(input) ? Promise.all(input) : input(db),
    chibiSourceCandidate: { upsert: async () => ({}) },
    student: {
      findMany: async ({ where }: any) => students.filter((row: any) => !Array.isArray(where.id?.in) || where.id.in.includes(row.id)).sort((left: any, right: any) => left.id - right.id),
      findUnique: async ({ where }: any) => studentById.get(where.id) ?? null,
    },
    studentChibiBinding: {
      findUnique: async ({ where }: any) => bindings.get(where.studentId) ?? null,
      create: async ({ data }: any) => { const created = { ...data, updatedAt: new Date() }; bindings.set(data.studentId, created); return created },
      updateMany: async ({ where, data }: any) => {
        const current = bindings.get(where.studentId)
        if (!current || (where.updatedAt && current.updatedAt?.getTime() !== where.updatedAt.getTime())) return { count: 0 }
        bindings.set(where.studentId, { ...current, ...data, updatedAt: new Date() })
        return { count: 1 }
      },
    },
    chibiAsset: {
      findFirst: async ({ where }: any) => assets.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
      findFirstOrThrow: async ({ where }: any) => {
        const found = assets.find(row => Object.entries(where).every(([key, value]) => row[key] === value))
        if (!found) throw new Error('asset not found')
        return found
      },
      create: async ({ data }: any) => { const created = { id: `asset-${assets.length + 1}`, ...data }; assets.push(created); return created },
    },
    chibiImportJob: {
      updateMany: async ({ where, data }: any) => {
        const job = jobs.get(where.id)
        if (!job || job.status !== where.status || (where.leaseToken && job.leaseToken !== where.leaseToken)) return { count: 0 }
        Object.assign(job, data)
        return { count: 1 }
      },
    },
    chibiImportItem: {
      createMany: async ({ data }: any) => {
        for (const item of data) if (!items.some(existing => existing.jobId === item.jobId && existing.studentId === item.studentId)) items.push({ status: 'pending', stage: 'pending', ...item, id: `${item.jobId}-${item.studentId}` })
        return { count: data.length }
      },
      findMany: async ({ where }: any) => items.filter(item => item.jobId === where.jobId && where.status.in.includes(item.status)).map(item => ({ ...item, student: studentById.get(item.studentId) })),
      update: async ({ where, data }: any) => { const item = items.find(existing => existing.id === where.id); Object.assign(item, data); return item },
      groupBy: async ({ where }: any) => {
        const counts = new Map<string, number>()
        for (const item of items.filter(existing => existing.jobId === where.jobId)) counts.set(item.status, (counts.get(item.status) ?? 0) + 1)
        return [...counts].map(([status, _count]) => ({ status, _count }))
      },
    },
  }
  return { db, jobs, items, assets, bindings }
}

function coreCacheFixture() {
  const profile = defaultProfile(candidate)
  const animator = selectAnimator(candidate, profile)
  assert.ok(animator.prefabPath)
  const currentRenderingProfile = annotateProjectMxSourceMeshEvidence(buildChibiRenderingProfile(candidate, animator.prefabPath, profile))
  const oldRenderingProfile = structuredClone(currentRenderingProfile) as any
  oldRenderingProfile.profileVersion = 'chibi-rendering-profile-v8'
  oldRenderingProfile.policyVersion = 'chibi-rendering-policy-v11'
  const coreFingerprint = buildCoreFingerprint({
    sourceIdentity: candidate.sourceIdentity, dependencyFingerprint: candidate.fingerprint,
    converterVersion: testCoreConverterVersion, materialVersion: CHIBI_MATERIAL_VERSION,
    adapterVersion: CHIBI_SHADER_ADAPTER_VERSION, exportOverrides: {}, profile: currentRenderingProfile,
    ...effectiveClipSelection(profile),
  })
  const glb = tinyGlb(oldRenderingProfile)
  const asset = {
    id: 'asset-cache', sourceIdentity: candidate.sourceIdentity, dependencyFingerprint: candidate.fingerprint,
    exporterVersion: CHIBI_EXPORTER_VERSION, fingerprint: 'old-diagnostics-fingerprint', coreFingerprint,
    coreFingerprintSchemaVersion: CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION,
    published: true, fileKey: 'published/cache.glb', checksum: createHash('sha256').update(glb).digest('hex'),
    clips: effectiveClipSelection(profile).clips, validation: { valid: true }, materials: {},
    arrangementDefault: { schemaVersion: 1, nodes: { '$model': { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } } },
  }
  const binding = { assetId: asset.id, sourceIdentity: candidate.sourceIdentity, identityPath: 'a', provenance: 'canonical', profile, overrides: {}, updatedAt: new Date() }
  return { asset, binding, bytes: glb }
}

async function writeCachedGlb(dataRoot: string, fixture: ReturnType<typeof coreCacheFixture>) {
  await mkdir(path.join(dataRoot, 'published'), { recursive: true })
  await writeFile(path.join(dataRoot, fixture.asset.fileKey), fixture.bytes)
}

function cacheJob(id: string) {
  return { id, mode: 'update', status: 'running', leaseToken: `${id}-lease`, selection: [] }
}

function queueTestStudents(labels: string[]) {
  const students = labels.map((label, index) => ({ id: 10010 + index, name: label, pathName: `fixture-${label}`, devName: null }))
  const bindings = (student: typeof students[number]) => {
    const profile = { ...defaultProfile(candidate), label: `queue-${student.name}` }
    const overrides = {
      sourceIdentity: candidate.sourceIdentity,
      identityPath: student.pathName,
      approvedCandidateFingerprint: candidate.fingerprint,
      profile,
      export: { fixture: student.name },
    }
    return {
      sourceIdentity: candidate.sourceIdentity, identityPath: student.pathName, provenance: 'manual', profile, overrides,
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }
  }
  return { students, bindings }
}

async function withChibiConcurrency<T>(value: string | null, run: () => Promise<T>) {
  const previous = process.env.CHIBI_CONCURRENCY
  if (value === null) delete process.env.CHIBI_CONCURRENCY
  else process.env.CHIBI_CONCURRENCY = value
  try { return await run() }
  finally {
    if (previous === undefined) delete process.env.CHIBI_CONCURRENCY
    else process.env.CHIBI_CONCURRENCY = previous
  }
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

const fixtureReport: InventoryReport = { version: 2, source: 'fixture', files: [], candidates: [candidate], errors: [] }

function fxCacheCandidate(evidenceNote: string): SourceCandidate {
  const targetReference = sourceReference('f'.repeat(64), 'CAB-fx', '101')
  const transformReference = sourceReference('f'.repeat(64), 'CAB-fx', '102')
  const rendererFxReference = sourceReference('f'.repeat(64), 'CAB-fx', '103')
  const monoBehaviourReference = sourceReference('f'.repeat(64), 'CAB-fx', '104')
  const meshReference = sourceReference('f'.repeat(64), 'CAB-fx', '105')
  const scriptReference = CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES[0]
  const fxTargetEvidence: any = {
    schemaVersion: 1,
    target: { file: targetReference.serializedFile, pathId: targetReference.objectId, externalGuid: '0'.repeat(32) },
    targetReference,
    rootType: 'GameObject',
    completeTraversal: true,
    classification: 'unknown',
    gameObjectCount: 1,
    componentTypeCounts: { Transform: 1, ParticleSystemRenderer: 1, MonoBehaviour: 1 },
    gameObjectReferences: [targetReference],
    transformReferences: [transformReference],
    componentReferences: [
      { sourceReference: transformReference, type: 'Transform' },
      { sourceReference: rendererFxReference, type: 'ParticleSystemRenderer' },
      { sourceReference: monoBehaviourReference, type: 'MonoBehaviour' },
    ],
    rendererAssets: [{
      rendererReference: rendererFxReference,
      mesh: {
        pointer: { file: meshReference.serializedFile, pathId: meshReference.objectId },
        fileID: 0, identityResolved: true, objectResolved: true, sourceReference: meshReference,
      },
      materials: [],
    }],
    rendererAssetEvidenceComplete: true,
    monoBehaviours: [{
      componentIdentity: { serializedFile: 'CAB-fx', pathId: '104', type: 'MonoBehaviour' },
      gameObjectIdentity: { serializedFile: 'CAB-fx', pathId: '101', name: 'Fx' },
      scriptPPtr: {
        fileID: 1, serializedFile: scriptReference.serializedFile, pathId: scriptReference.objectId,
        externalGuid: '0'.repeat(32), identityResolved: true, objectResolved: false, resolution: 'external-identity-only',
      },
      serializedFieldNames: ['LifeMode', 'ParentIndex', 'TimerTypeDuration'], serializedFieldPPtrs: [],
    }],
    approvedMonoScriptReferences: [scriptReference],
    monoScriptPolicyComplete: true,
    targetGraphPolicyVersion: 'chibi-particle-only-instantiate-fx-v1',
    targetGraphEligible: true,
    targetGraphEvidence: [
      `exact FX target source reference ${targetReference.bundleSha256}:${targetReference.serializedFile}:${targetReference.objectId}`,
      'complete Transform traversal covered 1 GameObjects',
      'all target graph renderers are ParticleSystemRenderer components',
      'every ParticleSystemRenderer mesh/material PPtr is recorded', evidenceNote,
    ],
    particleComponentTypes: ['ParticleSystemRenderer'], coreComponentTypes: [], unknownComponentTypes: ['MonoBehaviour'],
    reasons: [],
  }
  const result = structuredClone(candidate)
  result.clips = ['a_Cafe_Idle']
  result.events = [{
    clip: 'a_Cafe_Idle', time: 0.5, function: 'AniEvt_InstantiateFx', string: '', float: 0, int: 0,
    sourceClipReference: sourceReference('e'.repeat(64), 'CAB-animation', '501'),
    target: { file: targetReference.serializedFile, pathId: targetReference.objectId, externalGuid: '0'.repeat(32) },
    fxTargetReference: targetReference, fxTargetEvidence,
    fxTargetResolution: { status: 'resolved', reason: 'exact source PPtr', candidateCount: 1 },
  }]
  return result
}

function glbJson(bytes: Buffer) {
  return JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)).trim())
}

test('unchanged repeated imports skip an intact artifact without converting', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'chibi-repeat-import-'))
  const previousDataRoot = process.env.CHIBI_DATA_DIR
  try {
    process.env.CHIBI_DATA_DIR = dataRoot
    const profile = defaultProfile(candidate)
    const animator = selectAnimator(candidate, profile)
    assert.ok(animator.prefabPath)
    const renderingProfile = annotateProjectMxSourceMeshEvidence(buildChibiRenderingProfile(candidate, animator.prefabPath, profile))
    const coreFingerprint = buildCoreFingerprint({
      sourceIdentity: candidate.sourceIdentity, dependencyFingerprint: candidate.fingerprint,
      converterVersion: testCoreConverterVersion, materialVersion: CHIBI_MATERIAL_VERSION,
      adapterVersion: CHIBI_SHADER_ADAPTER_VERSION, exportOverrides: {}, profile: renderingProfile,
      ...effectiveClipSelection(profile),
    })
    const fixture = tinyGlb(renderingProfile)
    const fileKey = 'published/existing.glb'
    await mkdir(path.join(dataRoot, 'published'), { recursive: true })
    await writeFile(path.join(dataRoot, fileKey), fixture)
    const checksum = createHash('sha256').update(fixture).digest('hex')
    const fingerprint = buildFingerprint(candidate, profile, {}, renderingProfile)
    const asset = {
      id: 'asset-a', sourceIdentity: candidate.sourceIdentity, dependencyFingerprint: candidate.fingerprint,
      exporterVersion: CHIBI_EXPORTER_VERSION, fingerprint, coreFingerprint,
      coreFingerprintSchemaVersion: CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION,
      published: true, fileKey, checksum, clips: [], validation: { valid: true }, materials: {},
      arrangementDefault: { schemaVersion: 1, nodes: { '$model': { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } } },
    }
    const binding = { assetId: asset.id, sourceIdentity: candidate.sourceIdentity, identityPath: 'a', provenance: 'canonical', profile, overrides: {}, updatedAt: new Date() }
    const state = fakeDatabase(asset, binding)
    const report: InventoryReport = { version: 2, source: 'fixture', files: [], candidates: [candidate], errors: [] }
    let conversions = 0
    const convert = async () => { conversions += 1; throw new Error('conversion should not run for an unchanged artifact') }
    for (const [id, leaseToken] of [['job-1', 'lease-1'], ['job-2', 'lease-2']]) {
      state.jobs.set(id, { id, mode: 'update', status: 'running', leaseToken, selection: [] })
      await processTestJob(state.db, state.jobs.get(id), report, { convert, artifactIntact: async () => true })
    }
    assert.equal(conversions, 0, JSON.stringify(state.items.map(item => ({ status: item.status, diagnostic: item.diagnostic, timing: item.processingTiming }))))
    assert.deepEqual(state.items.map(item => item.status), ['skipped', 'skipped'], JSON.stringify(state.items.map(item => ({ status: item.status, diagnostic: item.diagnostic }))))
    assert.ok(state.items.every(item => item.processingTiming?.schemaVersion === 1 && item.processingTiming.totalMs >= 0))
    assert.ok(state.items.every(item => Object.keys(item.processingTiming.stagesMs).length === 11))
  } finally {
    if (previousDataRoot === undefined) delete process.env.CHIBI_DATA_DIR
    else process.env.CHIBI_DATA_DIR = previousDataRoot
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('FX-diagnostic-only profile deltas reuse validated core while actionable renderer changes reconvert', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'chibi-fx-core-cache-'))
  const previousDataRoot = process.env.CHIBI_DATA_DIR
  try {
    process.env.CHIBI_DATA_DIR = dataRoot
    const firstCandidate = fxCacheCandidate('source-authored graph census v1')
    const characterProfile = defaultProfile(firstCandidate)
    const animator = selectAnimator(firstCandidate, characterProfile)
    assert.ok(animator.prefabPath)
    const firstRenderingProfile = annotateProjectMxSourceMeshEvidence(buildChibiRenderingProfile(firstCandidate, animator.prefabPath, characterProfile))
    assert.equal(firstRenderingProfile.fxExclusionProofs.length, 1)
    const bytes = tinyGlb(firstRenderingProfile)
    const coreFingerprint = buildCoreFingerprint({
      sourceIdentity: firstCandidate.sourceIdentity, dependencyFingerprint: firstCandidate.fingerprint,
      converterVersion: testCoreConverterVersion, materialVersion: CHIBI_MATERIAL_VERSION,
      adapterVersion: CHIBI_SHADER_ADAPTER_VERSION, exportOverrides: {}, profile: firstRenderingProfile,
      ...effectiveClipSelection(characterProfile),
    })
    const asset = {
      id: 'asset-fx-core', sourceIdentity: firstCandidate.sourceIdentity, dependencyFingerprint: firstCandidate.fingerprint,
      exporterVersion: CHIBI_EXPORTER_VERSION,
      fingerprint: buildFingerprint(firstCandidate, characterProfile, {}, firstRenderingProfile),
      coreFingerprint, coreFingerprintSchemaVersion: CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION,
      published: true, fileKey: 'published/fx-core.glb', checksum: createHash('sha256').update(bytes).digest('hex'),
      clips: effectiveClipSelection(characterProfile).clips, validation: { valid: true }, materials: {},
      arrangementDefault: { schemaVersion: 1, nodes: { '$model': { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } } },
    }
    const binding = {
      assetId: asset.id, sourceIdentity: firstCandidate.sourceIdentity, identityPath: 'a', provenance: 'canonical',
      profile: characterProfile, overrides: {}, updatedAt: new Date(),
    }
    const state = fakeDatabase(asset, binding)
    state.db.student.findUnique = async () => ({ pathName: 'a', devName: null })
    state.db.chibiAsset.create = async ({ data }: any) => ({ id: 'asset-fx-metadata-revision', ...data })
    state.db.studentChibiBinding.updateMany = async ({ data }: any) => { Object.assign(binding, data); return { count: 1 } }
    await mkdir(path.join(dataRoot, 'published'), { recursive: true })
    await writeFile(path.join(dataRoot, asset.fileKey), bytes)

    const diagnosticCandidate = fxCacheCandidate('source-authored graph census v1; refreshed evidence wording')
    assert.equal(diagnosticCandidate.fingerprint, firstCandidate.fingerprint)
    let conversions = 0
    let metadataBytes: Buffer | null = null
    state.jobs.set('fx-diagnostic-job', cacheJob('fx-diagnostic-job'))
    await processTestJob(state.db, state.jobs.get('fx-diagnostic-job'), {
      version: 2, source: 'fx-diagnostic-only', files: [], candidates: [diagnosticCandidate], errors: [],
    }, {
      convert: async () => { conversions += 1; throw new Error('FX-only diagnostics must not reconvert') },
      artifactIntact: async () => true,
      publishMetadataArtifact: async rewritten => {
        metadataBytes = rewritten
        return { checksum: createHash('sha256').update(rewritten).digest('hex'), fileKey: 'published/fx-diagnostics.glb', validation: { valid: true } }
      },
    })
    assert.equal(conversions, 0)
    assert.ok(metadataBytes)
    assertMetadataOnlyGlbRewrite(bytes, metadataBytes!)
    assert.deepEqual(glbJson(metadataBytes!).scenes[0].extras.chibi.renderingProfileDiagnostics.fxExclusionProofs,
      glbJson(metadataBytes!).scenes[0].extras.chibi.renderingProfile.fxExclusionProofs)
    assert.deepEqual(glbJson(metadataBytes!).scenes[0].extras.chibi.renderingProfileDiagnostics.excludedFxInstantiationEvents,
      glbJson(metadataBytes!).scenes[0].extras.chibi.renderingProfile.excludedFxInstantiationEvents)
    assert.equal(state.items[0].status, 'reused')

    const coreChangedCandidate = fxCacheCandidate('source-authored graph census v1; refreshed evidence wording')
    coreChangedCandidate.assembly![0].renderers[0].visible = false
    const coreChangedCharacterProfile = defaultProfile(coreChangedCandidate)
    const coreChangedAnimator = selectAnimator(coreChangedCandidate, coreChangedCharacterProfile)
    assert.ok(coreChangedAnimator.prefabPath)
    const coreChangedRenderingProfile = annotateProjectMxSourceMeshEvidence(buildChibiRenderingProfile(
      coreChangedCandidate, coreChangedAnimator.prefabPath, coreChangedCharacterProfile,
    ))
    assert.notEqual(buildCoreFingerprint({
      sourceIdentity: coreChangedCandidate.sourceIdentity, dependencyFingerprint: coreChangedCandidate.fingerprint,
      converterVersion: testCoreConverterVersion, materialVersion: CHIBI_MATERIAL_VERSION,
      adapterVersion: CHIBI_SHADER_ADAPTER_VERSION, exportOverrides: {}, profile: coreChangedRenderingProfile,
      ...effectiveClipSelection(coreChangedCharacterProfile),
    }), coreFingerprint)
    assert.throws(() => rewriteGlbDiagnostics(bytes, coreChangedRenderingProfile), /actionable rendering decisions changed/)
    await writeFile(path.join(dataRoot, 'published/core-delta.glb'), bytes)
    const coreAsset = { ...asset, fileKey: 'published/core-delta.glb' }
    const isolatedCoreState = fakeDatabase(coreAsset, { ...binding, assetId: asset.id, updatedAt: new Date() })
    isolatedCoreState.db.student.findUnique = async () => ({ pathName: 'a', devName: null })
    let coreConversions = 0
    isolatedCoreState.jobs.set('fx-core-delta-job', cacheJob('fx-core-delta-job'))
    await processTestJob(isolatedCoreState.db, isolatedCoreState.jobs.get('fx-core-delta-job'), {
      version: 2, source: 'fx-core-delta', files: [], candidates: [coreChangedCandidate], errors: [],
    }, {
      convert: async () => { coreConversions += 1; throw new Error('actionable core delta reached full conversion') },
      artifactIntact: async () => true,
    })
    assert.equal(coreConversions, 1)
    assert.equal(isolatedCoreState.items[0].status, 'failed')
  } finally {
    if (previousDataRoot === undefined) delete process.env.CHIBI_DATA_DIR
    else process.env.CHIBI_DATA_DIR = previousDataRoot
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('strict pinned v12 artifacts are metadata-upgraded once and labelled without reconversion', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'chibi-v12-metadata-bridge-'))
  const previousDataRoot = process.env.CHIBI_DATA_DIR
  try {
    process.env.CHIBI_DATA_DIR = dataRoot
    const profile = defaultProfile(candidate)
    const animator = selectAnimator(candidate, profile)
    assert.ok(animator.prefabPath)
    const pinnedProfile = structuredClone(annotateProjectMxSourceMeshEvidence(buildChibiRenderingProfile(candidate, animator.prefabPath, profile))) as any
    const expectedCurrentFingerprint = buildFingerprint(candidate, profile, {}, pinnedProfile)
    pinnedProfile.profileVersion = 'chibi-rendering-profile-v9'
    pinnedProfile.policyVersion = 'chibi-rendering-policy-v12'
    const oldBytes = tinyGlb(pinnedProfile)
    const legacyAsset = {
      id: 'asset-v12', sourceIdentity: candidate.sourceIdentity, dependencyFingerprint: candidate.fingerprint,
      exporterVersion: PINNED_V12_EXPORTER_VERSION,
      fingerprint: buildPinnedV12Fingerprint(candidate.fingerprint, {}), coreFingerprint: null, coreFingerprintSchemaVersion: null,
      published: true, fileKey: 'published/v12.glb', checksum: createHash('sha256').update(oldBytes).digest('hex'),
      clips: effectiveClipSelection(profile).clips, validation: { valid: true }, materials: {},
      arrangementDefault: { schemaVersion: 1, nodes: { '$model': { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } } },
    }
    const binding = { assetId: legacyAsset.id, sourceIdentity: candidate.sourceIdentity, identityPath: 'a', provenance: 'canonical', profile, overrides: {}, updatedAt: new Date() }
    const state = fakeDatabase(legacyAsset, binding)
    state.db.student.findUnique = async () => ({ pathName: 'a', devName: null })
    let createdAssetData: any = null
    state.db.chibiAsset.create = async ({ data }: any) => { createdAssetData = data; return { id: 'asset-v12-revision', ...data } }
    state.db.studentChibiBinding.updateMany = async ({ data }: any) => { Object.assign(binding, data); return { count: 1 } }
    await mkdir(path.join(dataRoot, 'published'), { recursive: true })
    await writeFile(path.join(dataRoot, legacyAsset.fileKey), oldBytes)
    const job = cacheJob('job-v12-bridge')
    state.jobs.set(job.id, job)
    let conversions = 0
    let rewrittenBytes: Buffer | null = null
    await processTestJob(state.db, job, fixtureReport, {
      convert: async () => { conversions += 1; throw new Error('a proven v12 bridge must not reconvert') },
      publishMetadataArtifact: async bytes => {
        rewrittenBytes = bytes
        return { checksum: createHash('sha256').update(bytes).digest('hex'), fileKey: 'published/v12-metadata.glb', validation: { valid: true } }
      },
    })
    assert.equal(conversions, 0, JSON.stringify(state.items.map(item => ({ status: item.status, diagnostic: item.diagnostic, timing: item.processingTiming }))))
    assert.equal(state.items[0].status, 'reused')
    assert.equal(state.items[0].processingTiming.cacheCandidate, 'legacy-v12-version-pinned')
    assert.ok(rewrittenBytes)
    assert.equal(legacyAsset.coreFingerprint, null, 'legacy immutable revision remains unchanged')
    assert.equal(state.items[0].fingerprint, expectedCurrentFingerprint)
    const newCoreFingerprint = buildCoreFingerprint({
      sourceIdentity: candidate.sourceIdentity, dependencyFingerprint: candidate.fingerprint,
      converterVersion: testCoreConverterVersion, materialVersion: CHIBI_MATERIAL_VERSION,
      adapterVersion: CHIBI_SHADER_ADAPTER_VERSION, exportOverrides: {}, profile: pinnedProfile,
      ...effectiveClipSelection(profile),
    })
    assert.equal(createdAssetData.coreFingerprint, newCoreFingerprint)
    assert.equal(createdAssetData.coreFingerprintSchemaVersion, CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION)
    assert.equal(state.items[0].processingTiming.schemaVersion, 1)
  } finally {
    if (previousDataRoot === undefined) delete process.env.CHIBI_DATA_DIR
    else process.env.CHIBI_DATA_DIR = previousDataRoot
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('unverified converter identity stores no core key and a verified run converts instead of reusing it', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'chibi-cache-unverified-toolchain-'))
  const previousDataRoot = process.env.CHIBI_DATA_DIR
  try {
    process.env.CHIBI_DATA_DIR = dataRoot
    const fixture = coreCacheFixture()
    const state = fakeDatabase(null, fixture.binding)
    const createdAssets: any[] = []
    state.db.student.findUnique = async () => ({ pathName: 'a', devName: null })
    state.db.chibiAsset.findFirst = async ({ where }: any) => createdAssets.find(asset =>
      Object.entries(where).every(([key, value]) => asset[key] === value)) ?? null
    state.db.chibiAsset.create = async ({ data }: any) => {
      const asset = { id: `asset-unverified-${createdAssets.length}`, ...data }
      createdAssets.push(asset)
      return asset
    }
    state.db.studentChibiBinding.updateMany = async ({ data }: any) => { Object.assign(fixture.binding, data); return { count: 1 } }
    const job = cacheJob('job-unverified-toolchain')
    state.jobs.set(job.id, job)
    let conversions = 0
    let identityCalls = 0
    const convertedArtifact = {
      checksum: 'converted-checksum', fileKey: 'published/converted.glb', clips: [], materials: {}, validation: { valid: true },
      arrangementDefault: fixture.asset.arrangementDefault,
    }
    await processTestJob(state.db, job, fixtureReport, {
      coreConverterIdentity: async () => { identityCalls += 1; throw new Error('tool install hash unavailable') },
      convert: async () => { conversions += 1; return convertedArtifact as any },
    })
    assert.equal(identityCalls, 1, 'toolchain identity is computed once per job')
    assert.equal(conversions, 1)
    assert.equal(state.items[0].status, 'updated')
    assert.match(state.items[0].processingTiming.cacheFallbackReason, /cache reuse is disabled: tool install hash unavailable/)
    assert.equal(state.items[0].processingTiming.cacheCandidate, undefined)
    assert.ok(state.items[0].processingTiming.stagesMs.toolchainIdentity >= 0)
    assert.equal(Object.keys(state.items[0].processingTiming.stagesMs).length, 11)
    assert.equal(createdAssets[0].coreFingerprint, null)
    assert.equal(createdAssets[0].coreFingerprintSchemaVersion, null)

    const verifiedJob = cacheJob('job-verified-after-unverified')
    state.jobs.set(verifiedJob.id, verifiedJob)
    await processTestJob(state.db, verifiedJob, fixtureReport, {
      coreConverterIdentity: async () => TEST_CORE_CONVERTER_IDENTITY,
      convert: async () => { conversions += 1; return convertedArtifact as any },
    })
    assert.equal(conversions, 2, 'the verified run must not reuse the unverified conversion')
    assert.equal(state.items[1].status, 'updated')
    assert.equal(state.items[1].processingTiming.cacheCandidate, undefined)
    assert.match(createdAssets[1].coreFingerprint, /^v1:[0-9a-f]{64}$/)
    assert.equal(createdAssets[1].coreFingerprintSchemaVersion, CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION)
  } finally {
    if (previousDataRoot === undefined) delete process.env.CHIBI_DATA_DIR
    else process.env.CHIBI_DATA_DIR = previousDataRoot
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('unresolved dependencies reach conversion instead of retaining an old asset preemptively', async () => {
  const unresolved = { ...candidate, unresolvedDependencies: ['cab-missing'] }
  const state = fakeDatabase(null, null)
  const job = { id: 'job-unresolved', mode: 'update', status: 'running', leaseToken: 'lease-unresolved', selection: [] }
  state.jobs.set(job.id, job)
  let conversions = 0
  await processTestJob(state.db, job, { version: 2, source: 'fixture', files: [], candidates: [unresolved], errors: [] }, {
    convert: async () => { conversions += 1; throw new Error('exporter could not produce a model') },
  })
  assert.equal(conversions, 1)
  assert.equal(state.items[0].status, 'failed')
  assert.match(state.items[0].diagnostic, /exporter could not produce a model/)
  assert.equal(state.items[0].processingTiming.schemaVersion, 1)
  assert.ok(state.items[0].processingTiming.totalMs >= 0)
})

test('a usable incomplete import replaces the old binding and retains its warnings', async () => {
  const fixture = coreCacheFixture()
  const state = fakeDatabase(fixture.asset, fixture.binding)
  const job = { ...cacheJob('job-incomplete-replacement'), mode: 'force-rebuild' }
  state.jobs.set(job.id, job)
  const incomplete = { ...candidate, unresolvedDependencies: ['cab-missing'], shaders: [] }
  const warnings = ['Numeric renderer target unresolved', 'Missing dependency: cab-missing']
  let conversions = 0
  await processTestJob(state.db, job, { ...fixtureReport, candidates: [incomplete] }, {
    convert: async () => {
      conversions += 1
      return {
        checksum: 'new-checksum', fileKey: 'published/new.glb', clips: [], materials: {},
        validation: { valid: true, incompleteImport: { sourceComplete: false, warnings } },
        arrangementDefault: fixture.asset.arrangementDefault,
      } as any
    },
  })
  assert.equal(conversions, 1)
  assert.equal(state.items[0].status, 'updated')
  const active = state.bindings.get(10003)
  assert.notEqual(active.assetId, fixture.asset.id)
  assert.equal(active.status, 'available')
  assert.equal(active.diagnostic, warnings.join(' '))
  const published = state.assets.find(asset => asset.id === active.assetId)
  assert.equal(published.fileKey, 'published/new.glb')
  assert.equal(published.published, true)
  assert.equal(published.validation.incompleteImport.sourceComplete, false)
})

test('absent source prefab cannot replace the existing student binding', async () => {
  const existingBinding = {
    assetId: 'asset-existing', sourceIdentity: 'a', identityPath: 'a', provenance: 'canonical',
    profile: defaultProfile(candidate), overrides: {}, arrangementOverride: { schemaVersion: 1, nodes: { '$model': { visible: false } } },
    catalogVisible: false, updatedAt: new Date('2026-01-01T00:00:00Z'),
  }
  const invalidCandidate = { ...candidate, prefabPaths: [], assembly: [] }
  const state = fakeDatabase(null, existingBinding)
  const job = { id: 'job-retain-binding', mode: 'update', status: 'running', leaseToken: 'lease-retain', selection: [] }
  state.jobs.set(job.id, job)
  let bindingWrites = 0
  state.db.studentChibiBinding.update = async () => { bindingWrites += 1 }
  await processTestJob(state.db, job, { version: 2, source: 'fixture', files: [], candidates: [invalidCandidate], errors: [] }, { convert: async () => { throw new Error('unresolved source must not convert') } })
  assert.equal(state.items[0].status, 'unavailable')
  assert.equal(state.items[0].processingTiming.schemaVersion, 1)
  assert.ok(state.items[0].processingTiming.stagesMs.renderingProfile >= 0)
  assert.equal(existingBinding.assetId, 'asset-existing')
  assert.deepEqual(existingBinding.arrangementOverride, { schemaVersion: 1, nodes: { '$model': { visible: false } } })
  assert.equal(existingBinding.catalogVisible, false)
  assert.equal(bindingWrites, 0)
})

test('current GLB validation rejection falls back to conversion and persists bounded stage timings', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'chibi-cache-validation-'))
  const previousDataRoot = process.env.CHIBI_DATA_DIR
  try {
    process.env.CHIBI_DATA_DIR = dataRoot
    const fixture = coreCacheFixture()
    await writeCachedGlb(dataRoot, fixture)
    const state = fakeDatabase(fixture.asset, fixture.binding)
    const job = cacheJob('job-cache-validation')
    state.jobs.set(job.id, job)
    let conversions = 0
    await processTestJob(state.db, job, fixtureReport, {
      convert: async () => { conversions += 1; throw new Error('full conversion reached after current GLB validation rejection') },
    })
    assert.equal(conversions, 1)
    assert.equal(state.items[0].status, 'failed')
    assert.match(state.items[0].diagnostic, /full conversion reached after current GLB validation rejection/)
    const timing = state.items[0].processingTiming
    assert.match(timing.cacheFallbackReason, /Current GLB validation rejected metadata-only reuse/)
    assert.equal(timing.cacheFallbackReason.length <= 500, true)
    assert.ok(timing.stagesMs.metadataValidation >= 0)
    assert.ok(timing.stagesMs.conversion >= 0)
    assert.equal(Object.keys(timing.stagesMs).length, 11)
    assert.ok(JSON.stringify(timing).length < 2000)
  } finally {
    if (previousDataRoot === undefined) delete process.env.CHIBI_DATA_DIR
    else process.env.CHIBI_DATA_DIR = previousDataRoot
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('metadata artifact publication failure is explicit and never falls back to conversion', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'chibi-cache-publish-failure-'))
  const previousDataRoot = process.env.CHIBI_DATA_DIR
  try {
    process.env.CHIBI_DATA_DIR = dataRoot
    const fixture = coreCacheFixture()
    await writeCachedGlb(dataRoot, fixture)
    const state = fakeDatabase(fixture.asset, fixture.binding)
    const job = cacheJob('job-cache-publish-failure')
    state.jobs.set(job.id, job)
    let conversions = 0
    let publicationAttempts = 0
    await processTestJob(state.db, job, fixtureReport, {
      convert: async () => { conversions += 1; throw new Error('must not reconvert after storage failure') },
      publishMetadataArtifact: async () => { publicationAttempts += 1; throw new Error(`storage unavailable ${'x'.repeat(3000)}`) },
    })
    assert.equal(publicationAttempts, 1)
    assert.equal(conversions, 0)
    assert.equal(state.items[0].status, 'failed')
    assert.match(state.items[0].diagnostic, /Metadata-only artifact publication failed: storage unavailable/)
    assert.ok(state.items[0].diagnostic.length <= 1000)
    assert.equal(state.items[0].processingTiming.schemaVersion, 1)
    assert.ok(state.items[0].processingTiming.stagesMs.metadataArtifactPublication >= 0)
  } finally {
    if (previousDataRoot === undefined) delete process.env.CHIBI_DATA_DIR
    else process.env.CHIBI_DATA_DIR = previousDataRoot
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('metadata DB fencing failure is recorded without retrying or reconverting the published revision', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'chibi-cache-db-failure-'))
  const previousDataRoot = process.env.CHIBI_DATA_DIR
  try {
    process.env.CHIBI_DATA_DIR = dataRoot
    const fixture = coreCacheFixture()
    await writeCachedGlb(dataRoot, fixture)
    const state = fakeDatabase(fixture.asset, fixture.binding)
    state.db.student.findUnique = async () => ({ pathName: 'a', devName: null })
    state.db.chibiAsset.create = async () => { throw new Error('injected asset row publication failure') }
    const job = cacheJob('job-cache-db-failure')
    state.jobs.set(job.id, job)
    let conversions = 0
    let publicationAttempts = 0
    await processTestJob(state.db, job, fixtureReport, {
      convert: async () => { conversions += 1; throw new Error('must not reconvert after DB failure') },
      publishMetadataArtifact: async () => {
        publicationAttempts += 1
        return { checksum: 'metadata-checksum', fileKey: 'published/metadata.glb', validation: { valid: true } }
      },
    })
    assert.equal(publicationAttempts, 1)
    assert.equal(conversions, 0)
    assert.equal(state.items[0].status, 'failed')
    assert.match(state.items[0].diagnostic, /Metadata-only database publication failed: injected asset row publication failure/)
    assert.equal(state.items[0].processingTiming.schemaVersion, 1)
    assert.ok(state.items[0].processingTiming.stagesMs.databasePublication >= 0)
  } finally {
    if (previousDataRoot === undefined) delete process.env.CHIBI_DATA_DIR
    else process.env.CHIBI_DATA_DIR = previousDataRoot
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('fenced publication counts database time once when the transaction fails after the item update', async () => {
  let persistedTiming: any = null
  const db: any = {
    $transaction: async (callback: (tx: any) => Promise<unknown>) => {
      await callback(db)
      await new Promise(resolve => setTimeout(resolve, 15))
      throw new Error('injected transaction commit failure')
    },
    chibiImportJob: { updateMany: async () => {
      await new Promise(resolve => setTimeout(resolve, 15))
      return { count: 1 }
    } },
    student: { findUnique: async () => ({ pathName: 'a', devName: null }) },
    studentChibiBinding: { findUnique: async () => null, create: async () => ({}) },
    chibiAsset: { create: async ({ data }: any) => ({ id: 'asset-timing', ...data }) },
    chibiImportItem: { update: async ({ data }: any) => { persistedTiming = data.processingTiming; return data } },
  }
  const processingTiming = {
    startedAt: performance.now(),
    stagesMs: {
      toolchainIdentity: 0, mapping: 0, renderingProfile: 0, coreFingerprint: 0, cacheLookup: 0, artifactChecksum: 0,
      metadataRewrite: 0, metadataValidation: 0, metadataArtifactPublication: 0, conversion: 0, databasePublication: 0,
    },
  }
  const artifact = {
    checksum: 'checksum', fileKey: 'published/timing.glb', validation: { valid: true }, clips: [],
    arrangementDefault: { schemaVersion: 1, nodes: { '$model': { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } } },
  }
  const startedAt = performance.now()
  await assert.rejects(() => fencedPublish(db, {
    jobId: 'job-timing', leaseToken: 'lease-timing', itemId: 'item-timing',
    student: { id: 10003, name: 'A', pathName: 'a' }, candidate,
    profile: {}, fingerprint: 'fingerprint', artifact, dependencyFingerprint: 'dependency',
    provenance: 'canonical', identityPath: 'a', overrides: {},
    coreFingerprint: TEST_CORE_CONVERTER_IDENTITY, processingTiming,
  }), /injected transaction commit failure/)
  const elapsedMs = performance.now() - startedAt
  assert.ok(persistedTiming.stagesMs.databasePublication > 0)
  assert.ok(processingTiming.stagesMs.databasePublication <= elapsedMs * 1.25,
    `databasePublication ${processingTiming.stagesMs.databasePublication.toFixed(1)}ms exceeded single-count bound for ${elapsedMs.toFixed(1)}ms elapsed`)
  assert.ok(processingTiming.stagesMs.databasePublication >= elapsedMs * 0.8,
    'the failed transaction duration remains accounted for')
})

test('fenced publication preserves catalog visibility and arrangement override across a successful reimport', async () => {
  const expectedBindingUpdatedAt = new Date('2026-01-01T00:00:00Z')
  const equipmentKey = `${prefabBundle}:cab-prefab:3`
  const arrangementDefault = { schemaVersion: 1, nodes: {
    '$model': { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    [equipmentKey]: { visible: true, position: [0.4, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  } }
  const validation = { valid: true, equipmentBindingEvidence: [{ sourceReference: rendererReference, name: 'Weapon', hierarchyPath: 'Root/Weapon' }] }
  const existingBinding = {
    assetId: 'asset-old', sourceIdentity: 'a', identityPath: 'a', provenance: 'canonical', profile: defaultProfile(candidate), overrides: {},
    arrangementOverride: { schemaVersion: 1, nodes: { '$model': { visible: false }, [equipmentKey]: { position: [0.1, 0, 0] } } }, catalogVisible: false,
    updatedAt: expectedBindingUpdatedAt,
  }
  const calls: { asset?: any; binding?: any; item?: any } = {}
  let transactionOptions: unknown
  const db: any = {
    $transaction: async (callback: (tx: any) => Promise<unknown>, options: unknown) => {
      transactionOptions = options
      return callback(db)
    },
    chibiImportJob: { updateMany: async () => ({ count: 1 }) },
    student: { findUnique: async () => ({ pathName: 'a', devName: null }) },
    studentChibiBinding: {
      findUnique: async () => existingBinding,
      updateMany: async ({ data }: any) => { calls.binding = data; return { count: 1 } },
    },
    chibiAsset: {
      create: async ({ data }: any) => { calls.asset = data; return { id: 'asset-new', ...data } },
    },
    chibiImportItem: { update: async ({ data }: any) => { calls.item = data; return data } },
  }
  const result = await fencedPublish(db, {
    jobId: 'job-1', leaseToken: 'lease-1', itemId: 'item-1', student: { id: 10003, name: 'A', pathName: 'a' }, candidate,
    profile: defaultProfile(candidate), fingerprint: 'new-fingerprint',
    artifact: { checksum: 'new-checksum', fileKey: 'published/new.glb', validation, clips: [], arrangementDefault },
    dependencyFingerprint: 'new-source', previousAssetId: 'asset-old', provenance: 'canonical', identityPath: 'a', overrides: {},
    expectedBindingUpdatedAt, resultStatus: 'updated',
  })
  assert.equal(result.id, 'asset-new')
  assert.deepEqual(calls.asset?.arrangementDefault, arrangementDefault)
  assert.deepEqual(calls.binding?.arrangementOverride, { schemaVersion: 1, nodes: { '$model': { visible: false }, [equipmentKey]: { position: [0.5, 0, 0] } } })
  assert.equal(calls.binding?.catalogVisible, false)
  assert.equal(calls.item?.status, 'updated')
  assert.deepEqual(transactionOptions, { maxWait: 30_000, timeout: 30_000 })
})

test('item-recording transaction failure preserves the original processing error without retrying conversion', async () => {
  const state = fakeDatabase(null, null)
  const job = { id: 'job-record-failure', mode: 'update', status: 'running', leaseToken: 'lease-record-failure', selection: [] }
  state.jobs.set(job.id, job)
  const processingError = new Error('conversion publication failed')
  const recordingError = new Error('item failure transaction could not start')
  const transactionOptions: unknown[] = []
  let conversions = 0
  state.db.$transaction = async (input: any, options: unknown) => {
    if (Array.isArray(input)) return Promise.all(input)
    transactionOptions.push(options)
    throw recordingError
  }
  const previousConsoleError = console.error
  const loggedErrors: unknown[][] = []
  console.error = (...args: unknown[]) => { loggedErrors.push(args) }
  try {
    await assert.rejects(
      processTestJob(state.db, job, { version: 2, source: 'fixture', files: [], candidates: [candidate], errors: [] }, {
        convert: async () => { conversions += 1; throw processingError },
      }),
      error => error === processingError,
    )
  } finally {
    console.error = previousConsoleError
  }
  assert.equal(conversions, 1)
  assert.equal(state.items[0].status, 'running')
  assert.deepEqual(transactionOptions, [{ maxWait: 30_000, timeout: 30_000 }])
  assert.equal(loggedErrors.length, 1)
  assert.match(String(loggedErrors[0][0]), /job-record-failure-10003/)
  assert.equal(loggedErrors[0][1], recordingError)
})

test('bounded queue immediately uses a free slot while an earlier conversion is still running', async () => {
  await withChibiConcurrency('2', async () => {
    const fixture = queueTestStudents(['long', 'short', 'next'])
    const state = fakeDatabase(null, fixture.bindings, fixture.students)
    const job = cacheJob('job-queue-utilization')
    state.jobs.set(job.id, job)
    const longGate = deferred()
    const started: string[] = []
    let longFinished = false
    let nextStartedBeforeLongFinished = false

    await processTestJob(state.db, job, fixtureReport, {
      convert: async ({ profile }: any) => {
        const label = profile.label.replace('queue-', '')
        started.push(label)
        if (label === 'long') {
          await Promise.race([longGate.promise, new Promise(resolve => setTimeout(resolve, 250))])
          longFinished = true
        }
        if (label === 'next') {
          nextStartedBeforeLongFinished = !longFinished
          longGate.resolve()
        }
        throw new Error(`fixture conversion failure: ${label}`)
      },
    })

    assert.deepEqual(started, ['long', 'short', 'next'])
    assert.equal(nextStartedBeforeLongFinished, true)
    assert.deepEqual(state.items.map(item => item.status), ['failed', 'failed', 'failed'])
  })
})

test('same core fingerprint converts and publishes once when two roster items miss the cache together', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'chibi-queue-core-dedup-'))
  const previousDataRoot = process.env.CHIBI_DATA_DIR
  try {
    process.env.CHIBI_DATA_DIR = dataRoot
    const students = [
      { id: 10010, name: 'First', pathName: 'a', devName: 'a' },
      { id: 10011, name: 'Second', pathName: 'a', devName: 'a' },
    ]
    const state = fakeDatabase(null, null, students)
    const job = cacheJob('job-queue-core-dedup')
    state.jobs.set(job.id, job)

    const profile = defaultProfile(candidate)
    const animator = selectAnimator(candidate, profile)
    assert.ok(animator.prefabPath)
    const renderingProfile = annotateProjectMxSourceMeshEvidence(buildChibiRenderingProfile(candidate, animator.prefabPath, profile))
    const bytes = tinyGlb(renderingProfile)
    const fileKey = 'published/queue-core-dedup.glb'
    const checksum = createHash('sha256').update(bytes).digest('hex')
    await mkdir(path.join(dataRoot, 'published'), { recursive: true })
    await writeFile(path.join(dataRoot, fileKey), bytes)
    const arrangementDefault = { schemaVersion: 1, nodes: {
      '$model': { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    } }
    const validation = { valid: true, equipmentBindingEvidence: [] }
    let conversions = 0

    await withChibiConcurrency('2', () => processTestJob(state.db, job, fixtureReport, {
      artifactIntact: async () => true,
      convert: async () => {
        conversions += 1
        return {
          checksum, fileKey, clips: effectiveClipSelection(profile).clips, materials: {}, validation, arrangementDefault,
        } as any
      },
    }))

    assert.equal(conversions, 1)
    assert.equal(state.assets.length, 1, 'the queued duplicate reuses the just-published asset')
    assert.deepEqual(state.items.map(item => item.status), ['imported', 'reused'])
    assert.equal(state.items[0].assetId, state.items[1].assetId)
  } finally {
    if (previousDataRoot === undefined) delete process.env.CHIBI_DATA_DIR
    else process.env.CHIBI_DATA_DIR = previousDataRoot
    await rm(dataRoot, { recursive: true, force: true })
  }
})

test('unset concurrency stays serial and preserves source-order processing', async () => {
  await withChibiConcurrency(null, async () => {
    const fixture = queueTestStudents(['first', 'second', 'third'])
    const state = fakeDatabase(null, fixture.bindings, fixture.students)
    const job = cacheJob('job-queue-default-serial')
    state.jobs.set(job.id, job)
    const started: string[] = []
    let active = 0
    let maxActive = 0

    await processTestJob(state.db, job, fixtureReport, {
      convert: async ({ profile }: any) => {
        active += 1
        maxActive = Math.max(maxActive, active)
        started.push(profile.label.replace('queue-', ''))
        await new Promise(resolve => setTimeout(resolve, 5))
        active -= 1
        throw new Error('serial fixture failure')
      },
    })

    assert.deepEqual(started, ['first', 'second', 'third'])
    assert.equal(maxActive, 1)
    assert.equal(state.items.length, 3)
    assert.ok(state.items.every(item => item.status === 'failed'))
  })
})

test('lease loss aborts the bounded queue before any conversion starts', async () => {
  await withChibiConcurrency('2', async () => {
    const fixture = queueTestStudents(['first', 'second', 'third'])
    const state = fakeDatabase(null, fixture.bindings, fixture.students)
    const job = cacheJob('job-queue-lease-loss')
    state.jobs.set(job.id, job)
    const originalUpdateMany = state.db.chibiImportJob.updateMany
    state.db.chibiImportJob.updateMany = async (args: any) => args.data?.heartbeatAt
      ? { count: 0 }
      : originalUpdateMany(args)
    let conversions = 0

    await assert.rejects(processTestJob(state.db, job, fixtureReport, {
      convert: async () => { conversions += 1; throw new Error('lease loss must stop before conversion') },
    }), /Import job lease was lost\./)
    assert.equal(conversions, 0)
    assert.ok(state.items.every(item => item.status === 'pending'))
  })
})

test('external cancellation stops new queue claims and is propagated after active workers settle', async () => {
  await withChibiConcurrency('2', async () => {
    const fixture = queueTestStudents(['first', 'second', 'third'])
    const state = fakeDatabase(null, fixture.bindings, fixture.students)
    const job = cacheJob('job-queue-external-cancel')
    state.jobs.set(job.id, job)
    const controller = new AbortController()
    const cancelled = new Error('fixture cancellation')
    const started: string[] = []

    await assert.rejects(processTestJob(state.db, job, fixtureReport, {
      signal: controller.signal,
      convert: async ({ profile, signal }: any) => {
        started.push(profile.label.replace('queue-', ''))
        if (started.length === 2) controller.abort(cancelled)
        return new Promise((_resolve, reject) => {
          if (signal.aborted) reject(signal.reason)
          else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
      },
    }), error => error === cancelled)

    assert.deepEqual(started, ['first', 'second'])
    assert.deepEqual(state.items.map(item => item.status), ['failed', 'failed', 'pending'])
  })
})

test('job timing reports successful orchestration without letting the observer change the result', async () => {
  const state = fakeDatabase(null, null)
  const job = { ...cacheJob('job-timing-success'), mode: 'audit' }
  state.jobs.set(job.id, job)
  let observed: any

  await assert.doesNotReject(processTestJob(state.db, job, { version: 2, source: 'fixture', files: [], candidates: [], errors: [] }, {
    onJobTiming: timing => { observed = timing; throw new Error('observer fixture failure') },
  }))

  assert.equal(observed.outcome, 'success')
  assert.equal(observed.schemaVersion, 1)
  assert.ok(Number.isFinite(observed.totalMs) && observed.totalMs >= 0)
  for (const stage of ['candidateSync', 'jobInitialization', 'toolIdentity', 'itemQueue', 'finalProgress']) {
    assert.ok(Number.isFinite(observed.stagesMs[stage]) && observed.stagesMs[stage] >= 0, stage)
  }
  assert.equal(state.jobs.get(job.id).status, 'completed')
})

test('job timing captures candidate-sync failure and observer failure cannot hide the primary error', async () => {
  const state = fakeDatabase(null, null)
  const job = cacheJob('job-timing-candidate-sync-failure')
  state.jobs.set(job.id, job)
  const primaryError = new Error('candidate sync fixture failure')
  state.db.$transaction = async () => { throw primaryError }
  let observed: any

  await assert.rejects(processTestJob(state.db, job, fixtureReport, {
    onJobTiming: timing => { observed = timing; throw new Error('observer fixture failure') },
  }), error => error === primaryError)

  assert.equal(observed.outcome, 'failure')
  assert.ok(Number.isFinite(observed.totalMs) && observed.totalMs >= observed.stagesMs.candidateSync)
  assert.ok(observed.stagesMs.candidateSync >= 0)
  assert.equal(observed.stagesMs.jobInitialization, 0)
  assert.equal(observed.stagesMs.itemQueue, 0)
  assert.equal(observed.stagesMs.finalProgress, 0)
})

test('job timing distinguishes cancellation from an ordinary processing failure', async () => {
  const state = fakeDatabase(null, null)
  const job = { ...cacheJob('job-timing-aborted'), mode: 'audit' }
  state.jobs.set(job.id, job)
  const controller = new AbortController()
  const cancellation = new Error('cancelled before queue start')
  controller.abort(cancellation)
  let observed: any

  await assert.rejects(processTestJob(state.db, job, { version: 2, source: 'fixture', files: [], candidates: [], errors: [] }, {
    signal: controller.signal,
    onJobTiming: timing => { observed = timing },
  }), error => error === cancellation)

  assert.equal(observed.outcome, 'aborted')
  assert.ok(Number.isFinite(observed.totalMs) && observed.totalMs >= 0)
  assert.ok(observed.stagesMs.finalProgress === 0)
})
