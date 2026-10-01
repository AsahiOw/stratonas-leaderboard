import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { candidatesFromFiles, inventoryDiagnosticSummary, parseCharacterPart, parseInventoryRawChunks, readInventoryRawFile, runInventoryReader, UNITY_BUILTIN_QUAD_PATH_ID, UNITY_BUILTIN_RESOURCES_FILE, UNITY_BUILTIN_RESOURCES_GUID, type InventoryEntry, type InventoryFile, type InventoryFxTargetEvidence, type InventoryPointer, type InventorySourceReference } from './inventory'

test('streams complete inventory progress lines, enables scanner reporting, and preserves reader failures', async () => {
  const messages: string[] = []
  await runInventoryReader(process.execPath, ['-e', `
    if (process.env.CHIBI_INVENTORY_PROGRESS !== '1') process.exit(2);
    process.stderr.write('[chibi-inven');
    setTimeout(() => process.stderr.write('tory] Found 517 source archives/bundles\\n[other] ignored\\n[chibi-inventory] Reading キャラ'), 10);
  `], message => messages.push(message))
  assert.deepEqual(messages, ['Found 517 source archives/bundles', 'Reading キャラ'])
  await assert.rejects(runInventoryReader(process.execPath, ['-e', 'process.exit(3)'], () => {}), /exited with 3/)
})

async function* stringChunks(value: string, chunkSize: number): AsyncIterable<string> {
  for (let offset = 0; offset < value.length; offset += chunkSize) yield value.slice(offset, offset + chunkSize)
}

test('streams large raw inventory input in bounded chunks with exact v14 FX candidate semantics', async () => {
  const files = fxEventInventory()
  const rawText = JSON.stringify({ version: 2, source: 'BAAD/キャラ', metadataReader: 'render-profile-v8-instantiated-fx-source-proof', files })
  const chunkSize = 13
  assert.ok(rawText.length > chunkSize * 20, 'Fixture should be much larger than an individual stream chunk.')
  const parsed = await parseInventoryRawChunks(stringChunks(rawText, chunkSize))
  assert.equal(parsed.source, 'BAAD/キャラ')
  assert.equal(parsed.metadataReader, 'render-profile-v8-instantiated-fx-source-proof')
  assert.deepEqual(parsed.files, files)
  assert.deepEqual(candidatesFromFiles(parsed.files), candidatesFromFiles(files))
  const event = candidatesFromFiles(parsed.files).find(item => item.sourceIdentity === 'a')!.events[0]
  assert.equal(event.fxTargetResolution?.status, 'resolved')
  assert.equal(event.fxTargetEvidence?.targetGraphEligible, true)
})

test('reads the raw inventory cache without changing its serialized bytes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-inventory-stream-'))
  const rawPath = path.join(root, 'inventory.raw.json')
  try {
    const bytes = Buffer.from(JSON.stringify({ version: 2, source: 'BAAD', files: fxEventInventory() }), 'utf8')
    await writeFile(rawPath, bytes)
    const before = await readFile(rawPath)
    const parsed = await readInventoryRawFile(rawPath)
    const after = await readFile(rawPath)
    assert.equal(parsed.files.length, 1)
    assert.deepEqual(after, before)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects truncated raw inventory instead of returning a partial source profile', async () => {
  const truncated = '{"version":2,"source":"BAAD","files":[{"path":"broken.zip","entries":[]}'
  await assert.rejects(parseInventoryRawChunks(stringChunks(truncated, 9)), /ended before its files array was complete/)
})

test('compact inventory diagnostic preserves candidate assemblies without copying raw metadata', () => {
  const summary = inventoryDiagnosticSummary({
    version: 2, source: 'BAAD',
    files: [{ path: 'source.zip', size: 10, sha256: 'archive-hash', kind: 'archive', entries: [{
      path: 'model.bundle', size: 5, compressedSize: 3, crc32: '1234', sha256: 'bundle-hash',
      metadata: { objects: [{ type: 'Mesh', name: 'Body', pathId: '9223372036854775807' }], dependencies: [], events: [] },
    }] }],
    candidates: [{
      sourceIdentity: 'haruna', fingerprint: 'fingerprint', conflict: false, parts: [], families: [], revisions: [],
      clips: [], objectNames: [], materials: [], dependencies: [], events: [], assembly: [{
        root: 'Haruna', rendererOrder: [], renderers: [], attachments: {},
      }],
    }],
    errors: [],
  })
  assert.equal(summary.format, 'compact-diagnostic-v1')
  assert.equal('metadata' in summary.files[0].entries[0], false)
  assert.equal(summary.files[0].entries[0].sha256, 'bundle-hash')
  assert.equal(summary.candidates[0].eventCount, 0)
  assert.equal(summary.candidates[0].assembly[0].root, 'Haruna')
})

test('parses character dependency identity independently of archive file name', () => {
  assert.deepEqual(parseCharacterPart('nested/assets-_mx-characters-haruna_original-_mxdependency-meshes-2025-07-02_assets_all_1.bundle'), {
    sourceIdentity: 'haruna_original', family: 'meshes', revision: '2025-07-02',
  })
})

test('inventory selects the newest dated family and deduplicates identical archive copies', () => {
  const file = (path: string, sha256: string, entries: InventoryFile['entries']): InventoryFile => ({ path, sha256, size: 1, kind: 'archive', entries })
  const entry = (revision: string, crc32: string) => ({ path: `assets-_mx-characters-a-_mxdependency-meshes-${revision}_assets_all_1.bundle`, size: 10, compressedSize: 8, crc32, sha256: crc32.repeat(8) })
  const candidates = candidatesFromFiles([
    file('old.zip', 'a'.repeat(64), [entry('2025-01-01', '11111111')]),
    file('new.zip', 'b'.repeat(64), [entry('2026-01-01', '22222222')]),
    file('copy.zip', 'c'.repeat(64), [entry('2026-01-01', '22222222')]),
  ])
  assert.equal(candidates[0].parts.length, 1)
  assert.equal(candidates[0].parts[0].entryCrc32, '22222222')
  assert.equal(candidates[0].conflict, false)
})

test('different contents claiming the same identity family revision conflict', () => {
  const entries = ['11111111', '22222222'].map((crc32, index) => ({ path: `dir${index}/assets-_mx-characters-a-_mxdependency-meshes-2026-01-01_assets_all_${index}.bundle`, size: 10, compressedSize: 8, crc32, sha256: crc32.repeat(8) }))
  const candidate = candidatesFromFiles([{ path: 'x.zip', sha256: 'a'.repeat(64), size: 1, kind: 'archive', entries }])[0]
  assert.equal(candidate.conflict, true)
})

test('includes load and cafe bundles plus the exact serialized-file dependency closure', () => {
  const seedHash = '1'.repeat(64), loadHash = '2'.repeat(64), sharedHash = '3'.repeat(64)
  const files: InventoryFile[] = [{
    path: 'patch.zip', sha256: 'a'.repeat(64), size: 1, kind: 'archive', entries: [
      {
        path: 'assets-_mx-characters-haruna_original-_mxdependency-materials-2025-01-01_assets_all_1.bundle',
        size: 10, compressedSize: 8, crc32: '11111111', sha256: seedHash,
        metadata: {
          serializedFiles: ['CAB-character'], objects: [{ type: 'Material', name: 'Haruna_Original_EyeMouth', pathId: '1', file: 'CAB-character' }],
          dependencies: [{ name: 'CAB-shared', path: 'archive:/CAB-shared/CAB-shared' }], events: [],
          materials: [{ name: 'Haruna_Original_EyeMouth', pathId: '1', file: 'CAB-character', shader: { file: 'CAB-shared', pathId: '5' }, renderQueue: 3000, keywords: [], textures: [{ name: '_MainTex', texture: { file: 'CAB-shared', pathId: '6' } }] }],
        },
      },
      {
        path: 'character-haruna_original-_mxload-prefabs-2025-01-01_assets_all_2.bundle',
        size: 10, compressedSize: 8, crc32: '22222222', sha256: loadHash,
        metadata: { serializedFiles: ['CAB-load'], objects: [], dependencies: [], events: [], containers: [{ path: 'Assets/_MX/AddressableAsset/Character/Haruna_Original/Cafe/Cafe_Haruna_Original.prefab', target: { file: 'CAB-load', pathId: '10' } }] },
      },
      {
        path: 'shared-unrelated-name.bundle', size: 10, compressedSize: 8, crc32: '33333333', sha256: sharedHash,
        metadata: { serializedFiles: ['CAB-shared'], objects: [{ type: 'Shader', name: 'MXCharacterEyesMouthV2', pathId: '5', file: 'CAB-shared' }], dependencies: [], events: [], textures: [{ name: 'Haruna_Original_EyeMouth', pathId: '6', file: 'CAB-shared', width: 1024, height: 1024 }] },
      },
    ],
  }]
  const candidate = candidatesFromFiles(files).find(item => item.sourceIdentity === 'haruna_original')!
  assert.deepEqual(candidate.parts.map(part => part.sha256).sort(), [seedHash, loadHash, sharedHash].sort())
  assert.ok(candidate.prefabPaths?.some(item => item.endsWith('Cafe_Haruna_Original.prefab')))
  assert.equal(candidate.materialMetadata?.[0].shaderName, 'MXCharacterEyesMouthV2')
  assert.deepEqual(candidate.materialMetadata?.[0].resolvedTextures, [{ property: '_MainTex', name: 'Haruna_Original_EyeMouth', width: 1024, height: 1024 }])
})

test('preserves exact renderer slot and external texture identities despite duplicate material names and large IDs', () => {
  const prefabHash = '1'.repeat(64), materialHash = '2'.repeat(64), shaderHash = '3'.repeat(64), textureHash = '4'.repeat(64), meshHash = '5'.repeat(64)
  const bigA = '9007199254740993', bigB = '9007199254740995', shaderId = '9007199254740997', textureId = '9007199254740999'
  const sourceReference = (bundleSha256: string, serializedFile: string, objectId: string) => ({ bundleSha256, serializedFile, objectId })
  const candidate = candidatesFromFiles([{
    path: 'patch.zip', sha256: 'a'.repeat(64), size: 1, kind: 'archive', entries: [
      {
        path: 'assets-_mx-characters-haruna_original-_mxdependency-meshes-2026-01-01_assets_all_1.bundle',
        size: 10, compressedSize: 8, crc32: '00000001', sha256: prefabHash,
        metadata: {
          serializedFiles: ['CAB-prefab'],
          objects: [
            { type: 'GameObject', name: 'Cafe_Haruna_Original', pathId: '1', file: 'CAB-prefab', sourceReference: sourceReference(prefabHash, 'CAB-prefab', '1') },
            { type: 'SkinnedMeshRenderer', name: 'Shared_Renderer', pathId: '2', file: 'CAB-prefab', sourceReference: sourceReference(prefabHash, 'CAB-prefab', '2') },
          ],
          dependencies: ['CAB-materials', 'CAB-shaders', 'CAB-textures', 'CAB-meshes'], events: [],
          containers: [{ path: 'Assets/_MX/AddressableAsset/Character/Haruna_Original/Cafe/Cafe_Haruna_Original.prefab', target: { file: 'CAB-prefab', pathId: '1' } }],
          assembly: [{
            root: 'Cafe_Haruna_Original', prefabPath: 'Assets/_MX/AddressableAsset/Character/Haruna_Original/Cafe/Cafe_Haruna_Original.prefab',
            prefabTarget: { file: 'CAB-prefab', pathId: '1' }, rendererOrder: ['Shared_Renderer'],
            renderers: [{
              name: 'Shared_Renderer', pathId: '2', sourceReference: sourceReference(prefabHash, 'CAB-prefab', '2'),
              hierarchyPath: 'Cafe_Haruna_Original/Shared_Renderer', enabled: true, visible: true, gameObjectActive: true,
              rendererType: 'SkinnedMeshRenderer', mesh: { file: 'CAB-meshes', pathId: bigB },
              materialSlots: [
                { slot: 0, material: { file: 'CAB-materials', pathId: bigB } },
                { slot: 1, material: { file: 'CAB-materials', pathId: bigA } },
              ],
            }], attachments: {},
          }],
        },
      },
      {
        path: 'shared-materials.bundle', size: 10, compressedSize: 8, crc32: '00000002', sha256: materialHash,
        metadata: {
          serializedFiles: ['CAB-materials'],
          objects: [
            { type: 'Material', name: 'Shared_Face', pathId: bigA, file: 'CAB-materials', sourceReference: sourceReference(materialHash, 'CAB-materials', bigA) },
            { type: 'Material', name: 'Shared_Face', pathId: bigB, file: 'CAB-materials', sourceReference: sourceReference(materialHash, 'CAB-materials', bigB) },
          ],
          dependencies: ['CAB-shaders', 'CAB-textures'], events: [],
          materials: [bigA, bigB].map(pathId => ({
            name: 'Shared_Face', pathId, file: 'CAB-materials', sourceReference: sourceReference(materialHash, 'CAB-materials', pathId),
            shader: { file: 'CAB-shaders', pathId: shaderId }, shaderReference: null, shaderName: null, renderQueue: 2000, keywords: [],
            textures: [{ name: '_MainTex', texture: { file: 'CAB-textures', pathId: textureId }, textureReference: null, scale: { x: 0.5, y: 0.75 }, offset: { x: 0.25, y: 0.125 } }],
          })),
        },
      },
      {
        path: 'shared-shader.bundle', size: 10, compressedSize: 8, crc32: '00000003', sha256: shaderHash,
        metadata: {
          serializedFiles: ['CAB-shaders'], objects: [{ type: 'Shader', name: 'MXCharacterFace', pathId: shaderId, file: 'CAB-shaders', sourceReference: sourceReference(shaderHash, 'CAB-shaders', shaderId) }], dependencies: [], events: [],
          shaders: [{ name: 'MXCharacterFace', parsedName: 'MX/C-Face', pathId: shaderId, file: 'CAB-shaders', sourceReference: sourceReference(shaderHash, 'CAB-shaders', shaderId), programBlobSha256: '6'.repeat(64) }],
        },
      },
      {
        path: 'shared-texture.bundle', size: 10, compressedSize: 8, crc32: '00000004', sha256: textureHash,
        metadata: { serializedFiles: ['CAB-textures'], objects: [{ type: 'Texture2D', name: 'SharedAtlas', pathId: textureId, file: 'CAB-textures', sourceReference: sourceReference(textureHash, 'CAB-textures', textureId) }], dependencies: [], events: [], textures: [{ name: 'SharedAtlas', pathId: textureId, file: 'CAB-textures', sourceReference: sourceReference(textureHash, 'CAB-textures', textureId), width: 512, height: 512 }] },
      },
      {
        path: 'shared-mesh.bundle', size: 10, compressedSize: 8, crc32: '00000005', sha256: meshHash,
        metadata: { serializedFiles: ['CAB-meshes'], objects: [{ type: 'Mesh', name: 'SharedMesh', pathId: bigB, file: 'CAB-meshes', sourceReference: sourceReference(meshHash, 'CAB-meshes', bigB) }], dependencies: [], events: [] },
      },
    ],
  }]).find(item => item.sourceIdentity === 'haruna_original')!

  assert.equal(candidate.conflict, false)
  assert.deepEqual(candidate.assembly?.[0].renderers[0].materialSlots?.map(slot => slot.slot), [0, 1])
  assert.deepEqual(candidate.assembly?.[0].renderers[0].materialSlots?.map(slot => slot.sourceMaterialReference?.objectId), [bigB, bigA])
  assert.equal(candidate.assembly?.[0].renderers[0].meshSourceReference?.objectId, bigB)
  assert.deepEqual(candidate.sourceMaterials?.map(material => material.sourceReference?.objectId).sort(), [bigA, bigB])
  assert.equal(candidate.sourceMaterials?.[0].textures[0].textureReference?.bundleSha256, textureHash)
  assert.equal(candidate.sourceMaterials?.[0].resolvedTextures[0].sourceReference?.objectId, textureId)
  assert.equal(candidate.sourceMaterials?.every(material => material.name === 'Shared_Face'), true)
})

test('preserves exact unique equipment renderer source references alongside compatibility names', () => {
  const bundleHash = 'a'.repeat(64)
  const equipmentReference = { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '22' }
  const candidate = candidatesFromFiles([{
    path: 'equipment.zip', sha256: 'b'.repeat(64), size: 1, kind: 'archive', entries: [{
      path: 'assets-_mx-characters-a-_mxdependency-meshes-2026-01-01_assets_all_1.bundle', size: 10,
      compressedSize: 10, crc32: '', sha256: bundleHash,
      metadata: {
        serializedFiles: ['CAB-prefab'], objects: [], dependencies: [], events: [],
        assembly: [{
          root: 'Cafe_A', prefabPath: 'Assets/_MX/AddressableAsset/Character/A/Cafe/Cafe_A.prefab',
          prefabTarget: null, rendererOrder: ['A_Weapon'], renderers: [{
            name: 'A_Weapon', pathId: '22', sourceReference: equipmentReference,
            hierarchyPath: 'Cafe_A/A_Weapon', rendererType: 'SkinnedMeshRenderer', enabled: true,
            gameObjectActive: true, visible: true, rootBone: { file: 'CAB-prefab', pathId: '8', name: 'A_Weapon' },
            mesh: null, materialSlots: [],
          }], attachments: {
            equipmentRenderers: ['A_Weapon'], equipmentRendererReferences: [equipmentReference],
          },
        }],
      },
    }],
  }]).find(item => item.sourceIdentity === 'a')!

  assert.deepEqual(candidate.assembly?.[0].attachments.equipmentRenderers, ['A_Weapon'])
  assert.deepEqual(candidate.assembly?.[0].attachments.equipmentRendererReferences, [equipmentReference])
  assert.equal(candidate.assembly?.[0].attachments.equipmentRendererAmbiguities, undefined)
})

test('retains ambiguous equipment renderer evidence without selecting a renderer by name', () => {
  const bundleHash = 'c'.repeat(64)
  const firstReference = { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '22' }
  const secondReference = { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '23' }
  const renderer = (pathId: string, sourceReference: typeof firstReference) => ({
    name: 'A_Weapon', pathId, sourceReference, hierarchyPath: `Cafe_A/Weapon_${pathId}`,
    rendererType: 'SkinnedMeshRenderer' as const, enabled: true, gameObjectActive: true, visible: true,
    rootBone: { file: 'CAB-prefab', pathId: '8', name: 'A_Weapon' }, mesh: null, materialSlots: [],
  })
  const candidate = candidatesFromFiles([{
    path: 'equipment-ambiguous.zip', sha256: 'd'.repeat(64), size: 1, kind: 'archive', entries: [{
      path: 'assets-_mx-characters-a-_mxdependency-meshes-2026-01-01_assets_all_1.bundle', size: 10,
      compressedSize: 10, crc32: '', sha256: bundleHash,
      metadata: {
        serializedFiles: ['CAB-prefab'], objects: [], dependencies: [], events: [],
        assembly: [{
          root: 'Cafe_A', prefabPath: 'Assets/_MX/AddressableAsset/Character/A/Cafe/Cafe_A.prefab',
          prefabTarget: null, rendererOrder: ['A_Weapon', 'A_Weapon'],
          renderers: [renderer('22', firstReference), renderer('23', secondReference)], attachments: {
            equipmentRenderers: ['A_Weapon', 'A_Weapon'], equipmentRendererAmbiguities: [{
              name: 'A_Weapon', reasonCode: 'ambiguous-equipment-renderer-name',
              sourceReferences: [secondReference, firstReference],
            }],
          },
        }],
      },
    }],
  }]).find(item => item.sourceIdentity === 'a')!
  const attachments = candidate.assembly?.[0].attachments

  assert.deepEqual(attachments?.equipmentRenderers, ['A_Weapon', 'A_Weapon'])
  assert.equal(attachments?.equipmentRendererReferences, undefined)
  assert.deepEqual(attachments?.equipmentRendererAmbiguities, [{
    name: 'A_Weapon', reasonCode: 'ambiguous-equipment-renderer-name',
    sourceReferences: [firstReference, secondReference],
  }])
})

test('preserves exact transform-chain and skinned-bone evidence for authored equipment relations', () => {
  const bundleHash = 'e'.repeat(64)
  const rendererReference = { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '22' }
  const attachmentPointer = { file: 'CAB-prefab', pathId: '8', name: 'Bip001_Weapon' }
  const candidate = candidatesFromFiles([{
    path: 'equipment-evidence.zip', sha256: 'f'.repeat(64), size: 1, kind: 'archive', entries: [{
      path: 'assets-_mx-characters-a-_mxdependency-meshes-2026-01-01_assets_all_1.bundle', size: 10,
      compressedSize: 10, crc32: '', sha256: bundleHash,
      metadata: {
        serializedFiles: ['CAB-prefab'], objects: [], dependencies: [], events: [],
        assembly: [{
          root: 'Cafe_A', prefabPath: 'Assets/_MX/AddressableAsset/Character/A/Cafe/Cafe_A.prefab',
          prefabTarget: null, rendererOrder: ['A_Weapon'], renderers: [{
            name: 'A_Weapon', pathId: '22', sourceReference: rendererReference,
            hierarchyPath: 'Cafe_A/Weapon/A_Weapon', rendererType: 'SkinnedMeshRenderer', enabled: true,
            gameObjectActive: true, visible: true, rootBone: { ...attachmentPointer },
            transformChain: [
              { file: 'CAB-prefab', pathId: '1', name: 'Cafe_A' },
              { ...attachmentPointer },
              { file: 'CAB-prefab', pathId: '9', name: 'A_Weapon' },
            ],
            boneReferences: [{ ...attachmentPointer }, { file: 'CAB-prefab', pathId: '10', name: 'bone_magazine' }],
            mesh: null, materialSlots: [],
          }],
          attachments: {
            mainWeapon: [attachmentPointer],
            equipmentRenderers: ['A_Weapon'], equipmentRendererReferences: [rendererReference],
          },
        }],
      },
    }],
  }]).find(item => item.sourceIdentity === 'a')!

  const assembly = candidate.assembly?.[0]!
  assert.deepEqual(assembly.renderers[0].transformChain?.map(pointer => pointer.pathId), ['1', '8', '9'])
  assert.deepEqual(assembly.renderers[0].boneReferences?.map(pointer => pointer.pathId), ['8', '10'])
  assert.deepEqual(assembly.attachments.mainWeapon, [attachmentPointer])
  assert.deepEqual(assembly.attachments.equipmentRendererReferences, [rendererReference])
})

test('does not merge unresolved equipment ambiguities that name different authored attachment pointers', () => {
  const bundleHash = '1'.repeat(64)
  const firstReference = { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '22' }
  const secondReference = { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '23' }
  const candidate = candidatesFromFiles([{
    path: 'equipment-duplicate-attachments.zip', sha256: '2'.repeat(64), size: 1, kind: 'archive', entries: [{
      path: 'assets-_mx-characters-a-_mxdependency-meshes-2026-01-01_assets_all_1.bundle', size: 10,
      compressedSize: 10, crc32: '', sha256: bundleHash,
      metadata: {
        serializedFiles: ['CAB-prefab'], objects: [], dependencies: [], events: [],
        assembly: [{
          root: 'Cafe_A', prefabPath: 'Assets/_MX/AddressableAsset/Character/A/Cafe/Cafe_A.prefab',
          prefabTarget: null, rendererOrder: [], renderers: [], attachments: {
            equipmentRendererAmbiguities: [
              { name: 'A_Weapon', attachment: { file: 'CAB-prefab', pathId: '8', name: 'Bip001_Weapon' }, reasonCode: 'ambiguous-equipment-renderer-relation', sourceReferences: [firstReference] },
              { name: 'A_Weapon', attachment: { file: 'CAB-prefab', pathId: '9', name: 'Bip001_Weapon' }, reasonCode: 'ambiguous-equipment-renderer-relation', sourceReferences: [secondReference] },
            ],
          },
        }],
      },
    }],
  }]).find(item => item.sourceIdentity === 'a')!

  assert.deepEqual(candidate.assembly?.[0].attachments.equipmentRendererAmbiguities, [
    { name: 'A_Weapon', attachment: { file: 'CAB-prefab', pathId: '8', name: 'Bip001_Weapon' }, reasonCode: 'ambiguous-equipment-renderer-relation', sourceReferences: [firstReference] },
    { name: 'A_Weapon', attachment: { file: 'CAB-prefab', pathId: '9', name: 'Bip001_Weapon' }, reasonCode: 'ambiguous-equipment-renderer-relation', sourceReferences: [secondReference] },
  ])
})

test('retains the typed Unity built-in Quad identity for repeated renderer variants', () => {
  const bundleHash = '6'.repeat(64)
  const quad = {
    file: UNITY_BUILTIN_RESOURCES_FILE,
    pathId: UNITY_BUILTIN_QUAD_PATH_ID,
    externalGuid: UNITY_BUILTIN_RESOURCES_GUID,
    builtinResource: {
      kind: 'unity-builtin-resource' as const,
      guid: UNITY_BUILTIN_RESOURCES_GUID,
      file: UNITY_BUILTIN_RESOURCES_FILE,
      pathId: UNITY_BUILTIN_QUAD_PATH_ID,
      name: 'Quad' as const,
    },
  } as const
  const renderer = (objectId: string, name: string) => ({
    name, pathId: objectId, sourceReference: { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId },
    hierarchyPath: `Cafe_A/${name}`, rendererType: 'MeshRenderer', enabled: true, gameObjectActive: true, visible: true,
    mesh: structuredClone(quad) as typeof quad, meshSourceReference: null, materialSlots: [],
  })
  const candidate = candidatesFromFiles([{
    path: 'quad.zip', sha256: 'a'.repeat(64), size: 1, kind: 'archive', entries: [{
      path: 'assets-_mx-characters-a-_mxdependency-meshes-2026-01-01_assets_all_1.bundle', size: 10, compressedSize: 10,
      crc32: '', sha256: bundleHash,
      metadata: {
        serializedFiles: ['CAB-prefab'], objects: [], dependencies: [], events: [],
        assembly: [{ root: 'Cafe_A', prefabPath: 'Assets/_MX/AddressableAsset/Character/A/Cafe/Cafe_A.prefab',
          prefabTarget: { file: 'CAB-prefab', pathId: '1' }, prefabReference: { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '1' },
          rendererOrder: ['A_Face', 'A_Face_Alt'], renderers: [renderer('2', 'A_Face'), renderer('3', 'A_Face_Alt')], attachments: {} }],
      },
    }],
  }]).find(item => item.sourceIdentity === 'a')!
  assert.equal(candidate.assembly?.[0].renderers.length, 2)
  for (const item of candidate.assembly?.[0].renderers ?? []) {
    assert.deepEqual(item.mesh, quad)
    assert.equal(item.meshSourceReference, null)
  }
})

test('merges legacy zero mouth slots with exact per-component metadata', () => {
  const bundleHash = '9'.repeat(64)
  const prefabReference = { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '1' }
  const rendererReference = { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '2' }
  const baseRenderer = {
    name: 'Example_Body', pathId: '2', sourceReference: rendererReference,
    hierarchyPath: 'Cafe_Example/Example_Body', rendererType: 'SkinnedMeshRenderer', enabled: true,
    gameObjectActive: true, visible: true, mesh: null, materialSlots: [],
  }
  const legacyAssembly = {
    root: 'Cafe_Example', prefabPath: 'Assets/_MX/AddressableAsset/Character/Example/Cafe/Cafe_Example.prefab',
    prefabTarget: { file: 'CAB-prefab', pathId: '1' }, prefabReference,
    rendererOrder: ['Example_Body'], renderers: [baseRenderer],
    attachments: {
      mouthRenderer: [{ file: 'CAB-prefab', pathId: '2', name: 'Example_Body' }],
      mouthMaterialIndex: 0, mouthDefaultUV: { x: 0.125, y: 0.625 },
    },
  }
  const metadataAssembly = {
    ...legacyAssembly,
    attachments: {
      mouthMetadata: [{
        renderer: { file: 'CAB-prefab', pathId: '2', name: 'Example_Body' },
        sourceRendererReference: rendererReference, materialIndex: 0, defaultUV: { x: 0.125, y: 0.625 },
      }],
    },
  }
  const candidate = candidatesFromFiles([{
    path: 'example.zip', sha256: 'a'.repeat(64), size: 1, kind: 'archive', entries: [{
      path: 'character-example-_mxload-prefabs-2026-01-01_assets_all_1.bundle', size: 10,
      compressedSize: 10, crc32: '', sha256: bundleHash,
      metadata: {
        serializedFiles: ['CAB-prefab'], objects: [], dependencies: [], events: [],
        assembly: [legacyAssembly, metadataAssembly],
      },
    }],
  }]).find(item => item.sourceIdentity === 'example')!
  assert.equal(candidate.assembly?.length, 1)
  assert.equal(candidate.assembly?.[0].attachments.mouthMaterialIndex, 0)
  assert.deepEqual(candidate.assembly?.[0].attachments.mouthMetadata?.[0].sourceRendererReference, rendererReference)
})

test('does not merge duplicate prefab records when exact mouth metadata conflicts', () => {
  const bundleHash = '8'.repeat(64)
  const prefabReference = { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '1' }
  const rendererReference = { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '2' }
  const assembly = (materialIndex: number) => ({
    root: 'Cafe_Example', prefabPath: 'Assets/_MX/AddressableAsset/Character/Example/Cafe/Cafe_Example.prefab',
    prefabTarget: { file: 'CAB-prefab', pathId: '1' }, prefabReference,
    rendererOrder: ['Example_Body'], renderers: [{
      name: 'Example_Body', pathId: '2', sourceReference: rendererReference,
      hierarchyPath: 'Cafe_Example/Example_Body', rendererType: 'SkinnedMeshRenderer', enabled: true,
      gameObjectActive: true, visible: true, mesh: null, materialSlots: [],
    }],
    attachments: { mouthMetadata: [{
      renderer: { file: 'CAB-prefab', pathId: '2', name: 'Example_Body' },
      sourceRendererReference: rendererReference, materialIndex, defaultUV: { x: 0.125, y: 0.625 },
    }] },
  })
  const candidate = candidatesFromFiles([{
    path: 'example.zip', sha256: 'b'.repeat(64), size: 1, kind: 'archive', entries: [{
      path: 'character-example-_mxload-prefabs-2026-01-01_assets_all_1.bundle', size: 10,
      compressedSize: 10, crc32: '', sha256: bundleHash,
      metadata: { serializedFiles: ['CAB-prefab'], objects: [], dependencies: [], events: [], assembly: [assembly(0), assembly(1)] },
    }],
  }]).find(item => item.sourceIdentity === 'example')!
  assert.equal(candidate.assembly?.length, 2)
})

test('does not infer a built-in Quad from an unknown GUID, name, or null path', () => {
  const base = {
    kind: 'unity-builtin-resource' as const, guid: UNITY_BUILTIN_RESOURCES_GUID,
    file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID, name: 'Quad' as const,
  }
  const pointers: InventoryPointer[] = [
    { file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID, externalGuid: 'f'.repeat(32), builtinResource: { ...base, guid: 'f'.repeat(32) } } as unknown as InventoryPointer,
    { file: 'named-Quad', pathId: UNITY_BUILTIN_QUAD_PATH_ID, externalGuid: UNITY_BUILTIN_RESOURCES_GUID, builtinResource: { ...base, file: 'named-Quad' } } as unknown as InventoryPointer,
    { file: UNITY_BUILTIN_RESOURCES_FILE, pathId: '0', externalGuid: UNITY_BUILTIN_RESOURCES_GUID, builtinResource: { ...base, pathId: '0' } } as unknown as InventoryPointer,
  ]
  const renderers = pointers.map((mesh, index) => ({
    name: `A_Face_${index}`, pathId: String(index + 2), sourceReference: { bundleSha256: '7'.repeat(64), serializedFile: 'CAB-prefab', objectId: String(index + 2) },
    hierarchyPath: `Cafe_A/A_Face_${index}`, rendererType: 'MeshRenderer', enabled: false, gameObjectActive: true, visible: false,
    mesh, meshSourceReference: null, materialSlots: [],
  }))
  const candidate = candidatesFromFiles([{
    path: 'quad-unknown.zip', sha256: '8'.repeat(64), size: 1, kind: 'archive', entries: [{
      path: 'assets-_mx-characters-a-_mxdependency-meshes-2026-01-01_assets_all_1.bundle', size: 10, compressedSize: 10,
      crc32: '', sha256: '7'.repeat(64), metadata: {
        serializedFiles: ['CAB-prefab'], objects: [], dependencies: [], events: [],
        assembly: [{ root: 'Cafe_A', prefabPath: 'Assets/_MX/AddressableAsset/Character/A/Cafe/Cafe_A.prefab',
          prefabTarget: null, rendererOrder: renderers.map(item => item.name), renderers, attachments: {} }],
      },
    }],
  }]).find(item => item.sourceIdentity === 'a')!
  assert.equal(candidate.assembly?.[0].renderers.every(item => item.meshSourceReference === null), true)
  assert.deepEqual(candidate.assembly?.[0].renderers.map(item => item.mesh), pointers)
})

test('resolves an AnimationEvent target pointer to the exact selected renderer identity', () => {
  const bundleHash = '7'.repeat(64)
  const candidate = candidatesFromFiles([{
    path: 'patch.zip', sha256: '8'.repeat(64), size: 1, kind: 'archive', entries: [{
      path: 'assets-_mx-characters-a-_mxdependency-animationclips-2026-01-01_assets_all_1.bundle',
      size: 10, compressedSize: 8, crc32: '00000001', sha256: bundleHash,
      metadata: {
        serializedFiles: ['CAB-anim', 'CAB-prefab'],
        objects: [{ type: 'AnimationClip', name: 'A_Cafe_Idle', pathId: '10', file: 'CAB-anim' }],
        dependencies: [],
        events: [{ clip: 'A_Cafe_Idle', time: 0.25, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 5, target: { file: 'CAB-prefab', pathId: '2' } }],
        containers: [{ path: 'Assets/_MX/AddressableAsset/Character/A/Cafe/Cafe_A.prefab', target: { file: 'CAB-prefab', pathId: '1' } }],
        assembly: [{
          root: 'Cafe_A', prefabPath: 'Assets/_MX/AddressableAsset/Character/A/Cafe/Cafe_A.prefab',
          prefabTarget: { file: 'CAB-prefab', pathId: '1' }, rendererOrder: ['A_Body'],
          renderers: [{
            name: 'A_Body', pathId: '2', sourceReference: { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '2' },
            hierarchyPath: 'Cafe_A/A_Body', enabled: true, visible: true, gameObjectActive: true,
            mesh: null, materialSlots: [],
          }], attachments: {},
        }],
      },
    }],
  }]).find(item => item.sourceIdentity === 'a')!
  assert.deepEqual(candidate.events[0].targetReference, { bundleSha256: bundleHash, serializedFile: 'CAB-prefab', objectId: '2' })
})

function fxEventInventory(targetPathId = '900', externalGuid = '00000000000000000000000000000000', duplicateFxSource = false,
  functionName = 'AniEvt_InstantiateFx', sourceClipPathId = '20'): InventoryFile[] {
  const animationHash = 'a'.repeat(64), fxHash = 'b'.repeat(64), duplicateFxHash = 'c'.repeat(64)
  const animationReference = { bundleSha256: animationHash, serializedFile: 'CAB-animation', objectId: sourceClipPathId }
  const fxReference = { bundleSha256: fxHash, serializedFile: 'CAB-fx', objectId: '900' }
  const makeEvidence = (reference: InventorySourceReference): InventoryFxTargetEvidence => ({
    schemaVersion: 1,
    target: { file: reference.serializedFile, pathId: reference.objectId },
    targetReference: reference,
    rootType: 'GameObject',
    completeTraversal: true,
    classification: 'particle-only',
    gameObjectCount: 1,
    componentTypeCounts: { ParticleSystem: 1, ParticleSystemRenderer: 1, Transform: 1 },
    gameObjectReferences: [reference],
    transformReferences: [{ ...reference, objectId: '901' }],
    componentReferences: [
      { sourceReference: { ...reference, objectId: '901' }, type: 'Transform' },
      { sourceReference: { ...reference, objectId: '902' }, type: 'ParticleSystem' },
      { sourceReference: { ...reference, objectId: '903' }, type: 'ParticleSystemRenderer' },
    ],
    rendererAssets: [{
      rendererReference: { ...reference, objectId: '903' },
      mesh: { pointer: { file: reference.serializedFile, pathId: '0' }, fileID: 0, identityResolved: true, objectResolved: false, sourceReference: null },
      materials: [],
    }],
    rendererAssetEvidenceComplete: true,
    monoBehaviours: [],
    approvedMonoScriptReferences: [],
    monoScriptPolicyComplete: true,
    targetGraphPolicyVersion: 'chibi-particle-only-instantiate-fx-v1',
    targetGraphEligible: true,
    targetGraphEvidence: ['complete Transform traversal', 'particle-only renderer graph'],
    particleComponentTypes: ['ParticleSystem', 'ParticleSystemRenderer'],
    coreComponentTypes: [],
    unknownComponentTypes: [],
    reasons: [],
  })
  const entries: InventoryEntry[] = [{
    path: 'assets-_mx-characters-a-_mxdependency-animationclips-2026-01-01_assets_all_1.bundle',
    size: 10, compressedSize: 10, crc32: '00000001', sha256: animationHash,
    metadata: {
      serializedFiles: ['CAB-animation'],
      objects: [{ type: 'AnimationClip', name: 'A_Cafe_Touch', pathId: '20', file: 'CAB-animation', sourceReference: { ...animationReference } }],
      dependencies: [{ name: 'CAB-fx', path: 'archive:/CAB-fx' }],
      events: [{
        clip: 'A_Cafe_Touch', time: 0.5, function: functionName, string: '', float: 0, int: 0,
        ...(functionName === 'AniEvt_InstantiateFx' || functionName === 'InstantiateFx' ? { sourceClipReference: animationReference } : {}),
        target: { file: 'CAB-fx', pathId: targetPathId, externalGuid },
      }],
    },
  }, {
    path: 'fx-prefabs.bundle', size: 10, compressedSize: 10, crc32: '00000002', sha256: fxHash,
    metadata: {
      serializedFiles: ['CAB-fx'], objects: [], dependencies: [], events: [],
      containers: [{
        path: 'Assets/_MX/Characters/A/Effect/Prefab/FX.prefab',
        target: { file: 'CAB-fx', pathId: '900' }, targetReference: fxReference,
        fxTargetEvidence: makeEvidence(fxReference),
      }],
    },
  }]
  if (duplicateFxSource) entries.push({
    path: 'fx-prefabs-duplicate.bundle', size: 10, compressedSize: 10, crc32: '00000003', sha256: duplicateFxHash,
    metadata: {
      serializedFiles: ['CAB-fx'], objects: [], dependencies: [], events: [],
      containers: [{
        path: 'Assets/_MX/Characters/A/Effect/Prefab/OtherFX.prefab',
        target: { file: 'CAB-fx', pathId: '900' },
        targetReference: { ...fxReference, bundleSha256: duplicateFxHash },
        fxTargetEvidence: makeEvidence({ ...fxReference, bundleSha256: duplicateFxHash }),
      }],
    },
  })
  return [{ path: 'source.zip', sha256: 'd'.repeat(64), size: 1, kind: 'archive', entries }]
}

test('resolves InstantiateFx only through one exact source FX container graph', () => {
  const candidate = candidatesFromFiles(fxEventInventory()).find(item => item.sourceIdentity === 'a')!
  const event = candidate.events.find(item => item.function === 'AniEvt_InstantiateFx')!
  assert.deepEqual(event.fxTargetReference, { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-fx', objectId: '900' })
  assert.equal(event.fxTargetEvidence?.targetGraphEligible, true)
  assert.deepEqual(event.fxTargetResolution, {
    status: 'resolved', reason: 'Exact serialized file and path ID resolve to one source-pinned FX prefab hierarchy.', candidateCount: 1,
  })
})

test('resolves the exact serialized InstantiateFx alias and rejects wrong clip identities and arbitrary literals', () => {
  const alias = candidatesFromFiles(fxEventInventory('900', '00000000000000000000000000000000', false, 'InstantiateFx'))
    .find(item => item.sourceIdentity === 'a')!.events.find(item => item.function === 'InstantiateFx')!
  assert.deepEqual(alias.sourceClipReference, { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-animation', objectId: '20' })
  assert.deepEqual(alias.fxTargetReference, { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-fx', objectId: '900' })
  assert.equal(alias.fxTargetResolution?.status, 'resolved')

  const wrongClipIdentity = candidatesFromFiles(fxEventInventory('900', '00000000000000000000000000000000', false, 'InstantiateFx', '999'))
    .find(item => item.sourceIdentity === 'a')!.events[0]
  assert.equal(wrongClipIdentity.fxTargetReference, undefined)
  assert.equal(wrongClipIdentity.fxTargetResolution?.status, 'missing')
  assert.match(wrongClipIdentity.fxTargetResolution?.reason ?? '', /exact selected AnimationClip object/)

  const arbitrary = candidatesFromFiles(fxEventInventory('900', '00000000000000000000000000000000', false, 'InstantiateFxExtra'))
    .find(item => item.sourceIdentity === 'a')!.events[0]
  assert.equal(arbitrary.sourceClipReference, undefined)
  assert.equal(arbitrary.fxTargetResolution, undefined)
})

test('does not use prefab names, wrong target path IDs, or external GUID hints to resolve InstantiateFx', () => {
  const wrongPath = candidatesFromFiles(fxEventInventory('901')).find(item => item.sourceIdentity === 'a')!
    .events.find(item => item.function === 'AniEvt_InstantiateFx')!
  const wrongGuid = candidatesFromFiles(fxEventInventory('900', '11111111111111111111111111111111')).find(item => item.sourceIdentity === 'a')!
    .events.find(item => item.function === 'AniEvt_InstantiateFx')!
  assert.equal(wrongPath.fxTargetReference, undefined)
  assert.equal(wrongPath.fxTargetResolution?.status, 'missing')
  assert.equal(wrongGuid.fxTargetReference, undefined)
  assert.equal(wrongGuid.fxTargetResolution?.status, 'missing')
})

test('blocks InstantiateFx when one PPtr maps to multiple source bundle revisions', () => {
  const event = candidatesFromFiles(fxEventInventory('900', '00000000000000000000000000000000', true))
    .find(item => item.sourceIdentity === 'a')!.events.find(item => item.function === 'AniEvt_InstantiateFx')!
  assert.equal(event.fxTargetReference, undefined)
  assert.equal(event.fxTargetEvidence, undefined)
  assert.equal(event.fxTargetResolution?.status, 'ambiguous')
  assert.equal(event.fxTargetResolution?.candidateCount, 2)
})

test('keeps exact character material declarations found in dependency bundles only', () => {
  const seedHash = '4'.repeat(64), dependencyHash = '5'.repeat(64)
  const candidate = candidatesFromFiles([{
    path: 'patch.zip', sha256: '6'.repeat(64), size: 1, kind: 'archive', entries: [
      {
        path: 'assets-_mx-characters-chinatsu_original-_mxdependency-meshes-2025-01-01_assets_all_1.bundle',
        size: 10, compressedSize: 8, crc32: '44444444', sha256: seedHash,
        metadata: { serializedFiles: ['CAB-character'], objects: [], dependencies: [{ name: 'CAB-materials', path: 'archive:/CAB-materials' }], events: [] },
      },
      {
        path: 'shared.bundle', size: 10, compressedSize: 8, crc32: '55555555', sha256: dependencyHash,
        metadata: {
          serializedFiles: ['CAB-materials'], objects: [], dependencies: [], events: [],
          materials: [
            { name: 'Chinatsu_Original_EyeMouth', pathId: '1', file: 'CAB-materials', shader: null, renderQueue: -1, keywords: [], textures: [] },
            { name: 'Hasumi_Original_EyeMouth', pathId: '2', file: 'CAB-materials', shader: null, renderQueue: -1, keywords: [], textures: [] },
          ],
        },
      },
    ],
  }])[0]
  assert.deepEqual(candidate.materialMetadata?.map(material => material.name), ['Chinatsu_Original_EyeMouth'])
})

test('records unresolved serialized-file dependencies instead of silently dropping them', () => {
  const candidate = candidatesFromFiles([{ path: 'a.zip', sha256: 'a'.repeat(64), size: 1, kind: 'archive', entries: [{
    path: 'assets-_mx-characters-a-_mxdependency-meshes-2026-01-01_assets_all_1.bundle', size: 10, compressedSize: 8, crc32: '11111111', sha256: 'b'.repeat(64),
    metadata: { serializedFiles: ['CAB-a'], objects: [], dependencies: [{ name: 'CAB-missing', path: 'archive:/CAB-missing' }], events: [] },
  }] }])[0]
  assert.deepEqual(candidate.unresolvedDependencies, ['cab-missing'])
})

function dependencyFixture(sharedHash: string): InventoryFile[] {
  const entry = (path: string, sha256: string, metadata: InventoryEntry['metadata']): InventoryEntry => ({ path, size: 10, compressedSize: 10, crc32: '', sha256, metadata })
  return [
    { path: 'characters.zip', sha256: 'a'.repeat(64), size: 1, kind: 'archive', entries: [
      entry('assets-_mx-characters-a-_mxdependency-meshes-2026-01-01_assets_all_1.bundle', 'b'.repeat(64), { serializedFiles: ['CAB-a'], objects: [], dependencies: [{ name: 'CAB-shared-a', path: 'archive:/CAB-shared-a' }], events: [] }),
      entry('assets-_mx-characters-b-_mxdependency-meshes-2026-01-01_assets_all_1.bundle', 'c'.repeat(64), { serializedFiles: ['CAB-b'], objects: [], dependencies: [], events: [] }),
    ] },
    { path: 'shared.bundle', sha256: 'd'.repeat(64), size: 1, kind: 'bundle', entries: [
      entry('shared.bundle', sharedHash, { serializedFiles: ['CAB-shared-a'], objects: [], dependencies: [], events: [] }),
    ] },
  ]
}

test('a shared dependency change invalidates only the candidate that references it', () => {
  const before = candidatesFromFiles(dependencyFixture('1'.repeat(64)))
  const after = candidatesFromFiles(dependencyFixture('2'.repeat(64)))
  const beforeA = before.find(candidate => candidate.sourceIdentity === 'a')!
  const beforeB = before.find(candidate => candidate.sourceIdentity === 'b')!
  const afterA = after.find(candidate => candidate.sourceIdentity === 'a')!
  const afterB = after.find(candidate => candidate.sourceIdentity === 'b')!
  assert.notEqual(afterA.fingerprint, beforeA.fingerprint)
  assert.equal(afterB.fingerprint, beforeB.fingerprint)
})

test('discovers an identity from authoritative internal container paths', () => {
  const candidate = candidatesFromFiles([{ path: 'loose.bundle', sha256: 'a'.repeat(64), size: 10, kind: 'bundle', entries: [{
    path: 'loose.bundle', size: 10, compressedSize: 10, crc32: '', sha256: 'b'.repeat(64),
    metadata: { serializedFiles: ['CAB-loose'], objects: [], dependencies: [], events: [], containers: [{ path: 'Assets/_MX/Characters/Shun_Original/Model/Shun_Original.prefab', target: null }] },
  }] }]).find(item => item.sourceIdentity === 'shun_original')!
  assert.equal(candidate.parts[0].sourceKind, 'bundle')
  assert.deepEqual(candidate.families, ['internal'])
})

test('flags conflicting unversioned internal identities instead of choosing by file order', () => {
  const candidates = candidatesFromFiles([
    { path: 'a.bundle', sha256: 'a'.repeat(64), size: 10, kind: 'bundle', entries: [{
      path: 'a.bundle', size: 10, compressedSize: 10, crc32: '', sha256: 'b'.repeat(64),
      metadata: { serializedFiles: ['CAB-a'], objects: [], dependencies: [], events: [], containers: [{ path: 'Assets/_MX/Characters/Example/Model/Example.prefab', target: null }],
      },
    }] },
    { path: 'b.bundle', sha256: 'c'.repeat(64), size: 10, kind: 'bundle', entries: [{
      path: 'b.bundle', size: 10, compressedSize: 10, crc32: '', sha256: 'd'.repeat(64),
      metadata: { serializedFiles: ['CAB-b'], objects: [], dependencies: [], events: [], containers: [{ path: 'Assets/_MX/Characters/Example/Model/Example.prefab', target: null }],
      },
    }] },
  ] as InventoryFile[])
  assert.equal(candidates.find(item => item.sourceIdentity === 'example')?.conflict, true)
})

function arisMaidEquipmentGroupFixture(options: { crossPrefab?: boolean; missingMesh?: boolean } = {}): InventoryFile[] {
  const prefabBundle = 'a'.repeat(64), meshBundle = 'b'.repeat(64), materialBundle = 'c'.repeat(64), shaderBundle = 'd'.repeat(64)
  const sourceReference = (bundleSha256: string, serializedFile: string, objectId: string): InventorySourceReference => ({ bundleSha256, serializedFile, objectId })
  const attachment = { file: 'CAB-prefab', pathId: '99', name: 'Bip001_Weapon' }
  const renderers = ['20', '21'].map((objectId, index) => {
    const rendererReference = sourceReference(prefabBundle, 'CAB-prefab', objectId)
    const meshReference = sourceReference(meshBundle, 'CAB-mesh', String(30 + index))
    const materialReference = sourceReference(materialBundle, 'CAB-materials', String(40 + index))
    const shaderReference = sourceReference(shaderBundle, 'CAB-shaders', String(50 + index))
    const pointerFile = options.crossPrefab && index === 1 ? 'CAB-other-prefab' : 'CAB-prefab'
    return {
      name: index === 0 ? 'Aris_Original_Weapon' : 'FX_Aris_Original_Weapon', pathId: objectId,
      sourceReference: rendererReference, rendererType: 'SkinnedMeshRenderer', hierarchyPath: `Cafe_CH0200/${index === 0 ? 'Aris_Original_Weapon' : 'FX_Aris_Original_Weapon'}`,
      enabled: true, gameObjectActive: true, visible: true,
      rootBone: { file: pointerFile, pathId: attachment.pathId, name: attachment.name },
      transformChain: [{ file: 'CAB-prefab', pathId: '1', name: 'Cafe_CH0200' }, { file: pointerFile, pathId: attachment.pathId, name: attachment.name }, { file: 'CAB-prefab', pathId: objectId, name: index === 0 ? 'Aris_Original_Weapon' : 'FX_Aris_Original_Weapon' }],
      boneReferences: [{ file: pointerFile, pathId: attachment.pathId, name: attachment.name }],
      mesh: options.missingMesh && index === 1 ? { file: 'CAB-mesh', pathId: '0' } : { file: 'CAB-mesh', pathId: meshReference.objectId },
      meshSourceReference: options.missingMesh && index === 1 ? null : meshReference,
      materialSlots: [{ slot: 0, material: { file: 'CAB-materials', pathId: materialReference.objectId }, sourceMaterialReference: materialReference }],
      materialReference, shaderReference,
    }
  })
  const materials = renderers.map(renderer => ({
    name: `Aris_Maid_Weapon_${renderer.pathId}`, pathId: renderer.materialReference.objectId, file: renderer.materialReference.serializedFile,
    sourceReference: renderer.materialReference, shader: { file: renderer.shaderReference.serializedFile, pathId: renderer.shaderReference.objectId }, shaderReference: renderer.shaderReference,
    shaderName: '', shaderParsedName: 'MX/C-Weapon', renderQueue: 2000, keywords: [], textures: [], floatProperties: {}, intProperties: {}, colorProperties: {},
  }))
  const shaders = renderers.map(renderer => ({
    name: '', parsedName: 'MX/C-Weapon', pathId: renderer.shaderReference.objectId, file: renderer.shaderReference.serializedFile,
    sourceReference: renderer.shaderReference, programBlobSha256: 'e'.repeat(64),
  }))
  const rendererRecords = renderers.map(({ materialReference: _materialReference, shaderReference: _shaderReference, ...renderer }) => renderer)
  const entry: InventoryEntry = {
    path: 'assets-_mx-characters-aris_maid-_mxdependency-meshes-2025-07-02_assets_all_1.bundle', size: 10, compressedSize: 10, crc32: '', sha256: prefabBundle,
    metadata: {
      serializedFiles: ['CAB-prefab'], objects: [], dependencies: [], events: [], materials, shaders,
      assembly: [{
        root: 'Cafe_CH0200', prefabPath: 'Assets/_MX/AddressableAsset/Character/CH0200/Cafe/Cafe_CH0200.prefab',
        prefabTarget: { file: 'CAB-prefab', pathId: '1' }, prefabReference: sourceReference(prefabBundle, 'CAB-prefab', '1'),
        rendererOrder: rendererRecords.map(renderer => renderer.name), renderers: rendererRecords, attachments: {
          mainWeapon: [attachment], equipmentRendererAmbiguities: [{
            name: 'Bip001_Weapon', attachment, reasonCode: 'ambiguous-equipment-renderer-relation',
            sourceReferences: renderers.map(renderer => renderer.sourceReference),
          }],
        },
      }],
    },
  }
  return [{ path: 'aris.zip', sha256: 'f'.repeat(64), size: 1, kind: 'archive', entries: [entry] }]
}

function structuralBip001WeaponGroupFixture(options: {
  bodyOverlap?: boolean
  thirdRenderer?: boolean
  singleRenderer?: boolean
  mismatchedPointer?: boolean
  mismatchedSource?: boolean
  nonWeaponNames?: boolean
} = {}): InventoryFile[] {
  const files = arisMaidEquipmentGroupFixture()
  const sourceReference = (bundleSha256: string, serializedFile: string, objectId: string): InventorySourceReference => ({ bundleSha256, serializedFile, objectId })
  const entry = files[0].entries[0]
  const assembly = entry.metadata!.assembly![0]
  assembly.attachments = {}
  const renderers = assembly.renderers
  renderers[0].name = 'Nonomi_Weapon'
  renderers[1].name = 'CH0092_Weapon'
  renderers[0].hierarchyPath = 'Cafe_CH0092/Nonomi_Weapon'
  renderers[1].hierarchyPath = 'Cafe_CH0092/CH0092_Weapon'
  if (options.nonWeaponNames) {
    renderers[0].name = 'Renderer_A'
    renderers[1].name = 'Renderer_B'
    renderers[0].hierarchyPath = 'Cafe_CH0092/Renderer_A'
    renderers[1].hierarchyPath = 'Cafe_CH0092/Renderer_B'
    entry.metadata!.materials = (entry.metadata!.materials ?? []).map(material => ({ ...material, name: `Material_${material.pathId}` }))
  }
  const anchor = { file: 'CAB-prefab', pathId: '99', name: 'Bip001_Weapon' }
  for (const renderer of renderers) {
    renderer.rootBone = options.mismatchedPointer && renderer === renderers[1]
      ? { ...anchor, file: 'CAB-other-prefab' }
      : { ...anchor }
    renderer.transformChain = [
      { file: 'CAB-prefab', pathId: '1', name: 'Cafe_CH0092' },
      { file: renderer.rootBone!.file, pathId: anchor.pathId, name: anchor.name },
      { file: 'CAB-prefab', pathId: renderer.pathId, name: renderer.name },
    ]
    renderer.boneReferences = [{ ...renderer.rootBone }]
  }
  if (options.mismatchedSource) {
    renderers[1].sourceReference = sourceReference('e'.repeat(64), 'CAB-other-renderer', '21')
  }
  if (options.singleRenderer) {
    assembly.renderers = [renderers[0]]
    assembly.rendererOrder = [renderers[0].name]
  } else if (options.bodyOverlap || options.thirdRenderer) {
    const third = structuredClone(renderers[0])
    third.name = options.bodyOverlap ? 'CH0092_Body' : 'CH0092_Accessory'
    third.pathId = '22'
    third.sourceReference = sourceReference('a'.repeat(64), 'CAB-prefab', '22')
    third.hierarchyPath = `Cafe_CH0092/${third.name}`
    third.transformChain = [
      { file: 'CAB-prefab', pathId: '1', name: 'Cafe_CH0092' },
      { ...anchor },
      { file: 'CAB-prefab', pathId: third.pathId, name: third.name },
    ]
    third.rootBone = { ...anchor }
    third.boneReferences = [{ ...anchor }]
    assembly.renderers.push(third)
    assembly.rendererOrder.push(third.name)
  }
  return files
}

test('promotes Aris Maid exact two-renderer mainWeapon groups only with complete source evidence', () => {
  const candidate = candidatesFromFiles(arisMaidEquipmentGroupFixture()).find(item => item.sourceIdentity === 'aris_maid')!
  const attachments = candidate.assembly?.[0].attachments
  assert.equal(attachments?.equipmentRendererAmbiguities, undefined)
  assert.deepEqual(attachments?.equipmentRendererReferences?.map(reference => reference.objectId), ['20', '21'])
  assert.equal(attachments?.equipmentRendererGroups?.length, 1)
  assert.equal(attachments?.equipmentRendererGroups?.[0].kind, 'mainWeapon')
  assert.match(attachments?.equipmentRendererGroups?.[0].evidence.join(' | ') ?? '', /unique same-prefab mainWeapon renderer group/)
})

test('keeps Aris Maid one-to-many groups blocked for cross-prefab or incomplete renderer evidence', () => {
  for (const files of [arisMaidEquipmentGroupFixture({ crossPrefab: true }), arisMaidEquipmentGroupFixture({ missingMesh: true })]) {
    const candidate = candidatesFromFiles(files).find(item => item.sourceIdentity === 'aris_maid')!
    const attachments = candidate.assembly?.[0].attachments
    assert.equal(attachments?.equipmentRendererGroups, undefined)
    assert.equal(attachments?.equipmentRendererReferences, undefined)
    assert.equal(attachments?.equipmentRendererAmbiguities?.length, 1)
  }
})

test('promotes a generic exact two-renderer Bip001_Weapon m_Bones group without an authored slot or weapon names', () => {
  const candidate = candidatesFromFiles(structuralBip001WeaponGroupFixture({ nonWeaponNames: true })).find(item => item.sourceIdentity === 'aris_maid')!
  const attachments = candidate.assembly?.[0].attachments
  assert.deepEqual(attachments?.equipmentRendererReferences?.map(reference => reference.objectId), ['20', '21'])
  assert.equal(attachments?.equipmentRendererGroups?.length, 1)
  assert.equal(attachments?.equipmentRendererGroups?.[0].kind, 'structuralWeapon')
  assert.match(attachments?.equipmentRendererGroups?.[0].evidence.join(' | ') ?? '', /unique same-prefab structural Bip001_Weapon renderer group/)
})

test('keeps a generic Bip001_Weapon group blocked for body, third, single, pointer, or source conflicts', () => {
  const fixtures = [
    structuralBip001WeaponGroupFixture({ bodyOverlap: true }),
    structuralBip001WeaponGroupFixture({ thirdRenderer: true }),
    structuralBip001WeaponGroupFixture({ singleRenderer: true }),
    structuralBip001WeaponGroupFixture({ mismatchedPointer: true }),
    structuralBip001WeaponGroupFixture({ mismatchedSource: true }),
  ]
  for (const files of fixtures) {
    const candidate = candidatesFromFiles(files).find(item => item.sourceIdentity === 'aris_maid')!
    const attachments = candidate.assembly?.[0].attachments
    assert.equal(attachments?.equipmentRendererGroups, undefined)
    assert.equal(attachments?.equipmentRendererReferences, undefined)
  }
})
