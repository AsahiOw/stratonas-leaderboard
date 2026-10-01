import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { retainIntermediateFbx } from './intermediate-fbx-retention'

async function fixtureRoots(root: string) {
  const roots = {
    sourceRoot: path.join(root, 'source'),
    dataRoot: path.join(root, 'data'),
    toolsRoot: path.join(root, 'tools'),
    workspaceRoot: path.join(root, 'workspace'),
  }
  await Promise.all(Object.values(roots).map(directory => mkdir(directory, { recursive: true })))
  return roots
}

test('copies the selected FBX byte-for-byte to an empty isolated directory and writes its hash receipt', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-fbx-retention-'))
  try {
    const roots = await fixtureRoots(root)
    const work = path.join(roots.dataRoot, 'work', 'candidate')
    const diagnosticDirectory = path.join(root, 'diagnostic')
    await mkdir(path.join(work, 'exported'), { recursive: true })
    await mkdir(diagnosticDirectory)
    const sourceFile = path.join(work, 'exported', 'Hanae_Rabbit.fbx')
    const sourceBytes = Buffer.from('exact synthetic FBX bytes\0\u0001')
    await writeFile(sourceFile, sourceBytes)

    const receipt = await retainIntermediateFbx({
      sourceFile,
      directory: diagnosticDirectory,
      sourceIdentity: 'Hanae_Rabbit',
      forbiddenRoots: Object.values(roots),
    })

    const retained = await readFile(path.join(diagnosticDirectory, 'intermediate.fbx'))
    assert.deepEqual(retained, sourceBytes)
    assert.deepEqual(receipt, {
      schemaVersion: 1,
      kind: 'chibi-intermediate-fbx-retention',
      sourceIdentity: 'Hanae_Rabbit',
      sourceFileName: 'Hanae_Rabbit.fbx',
      fileName: 'intermediate.fbx',
      bytes: sourceBytes.length,
      sha256: createHash('sha256').update(sourceBytes).digest('hex'),
    })
    assert.deepEqual(JSON.parse(await readFile(path.join(diagnosticDirectory, 'intermediate.fbx.receipt.json'), 'utf8')), receipt)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('leaves ordinary conversion disabled when no diagnostic directory is supplied', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-fbx-retention-disabled-'))
  try {
    const receipt = await retainIntermediateFbx({
      sourceFile: path.join(root, 'not-read.fbx'),
      directory: undefined,
      sourceIdentity: 'candidate',
      forbiddenRoots: [],
    })
    assert.equal(receipt, null)
    assert.deepEqual(await readdir(root), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects diagnostic directories inside or above every protected root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-fbx-retention-overlap-'))
  try {
    const roots = await fixtureRoots(root)
    const sourceFile = path.join(roots.dataRoot, 'candidate.fbx')
    await writeFile(sourceFile, 'fixture')

    for (const protectedRoot of Object.values(roots)) {
      const childDirectory = path.join(protectedRoot, 'diagnostic')
      await mkdir(childDirectory)
      await assert.rejects(retainIntermediateFbx({
        sourceFile,
        directory: childDirectory,
        sourceIdentity: 'candidate',
        forbiddenRoots: Object.values(roots),
      }), /overlaps a protected conversion root/)
      await rm(childDirectory, { recursive: true })
    }

    const diagnosticAncestor = path.join(root, 'diagnostic-ancestor')
    await mkdir(diagnosticAncestor)
    for (const protectedRoot of Object.values(roots)) {
      const nestedRoot = path.join(diagnosticAncestor, path.basename(protectedRoot))
      await mkdir(nestedRoot)
      await assert.rejects(retainIntermediateFbx({
        sourceFile,
        directory: diagnosticAncestor,
        sourceIdentity: 'candidate',
        forbiddenRoots: [nestedRoot],
      }), /overlaps a protected conversion root/)
      await rm(nestedRoot, { recursive: true })
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects aliases with the selected FBX itself', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-fbx-retention-source-alias-'))
  try {
    const roots = await fixtureRoots(root)
    const exported = path.join(roots.dataRoot, 'work', 'exported')
    await mkdir(exported, { recursive: true })
    const sourceFile = path.join(exported, 'character.fbx')
    await writeFile(sourceFile, 'fixture')
    await assert.rejects(retainIntermediateFbx({
      sourceFile,
      directory: exported,
      sourceIdentity: 'candidate',
      forbiddenRoots: [roots.sourceRoot, roots.toolsRoot, roots.workspaceRoot],
    }), /overlaps the selected FBX source/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('never overwrites retained evidence in a reused diagnostic directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-fbx-retention-exclusive-'))
  try {
    const roots = await fixtureRoots(root)
    const work = path.join(roots.dataRoot, 'work')
    const diagnosticDirectory = path.join(root, 'diagnostic')
    await mkdir(work, { recursive: true })
    await mkdir(diagnosticDirectory)
    const sourceFile = path.join(work, 'character.fbx')
    await writeFile(sourceFile, 'original bytes')
    const options = { sourceFile, directory: diagnosticDirectory, sourceIdentity: 'candidate', forbiddenRoots: Object.values(roots) }
    const first = await retainIntermediateFbx(options)
    await writeFile(sourceFile, 'changed bytes')
    await assert.rejects(retainIntermediateFbx(options), /must be empty/)
    assert.equal((await readFile(path.join(diagnosticDirectory, 'intermediate.fbx'))).toString(), 'original bytes')
    assert.equal(JSON.parse(await readFile(path.join(diagnosticDirectory, 'intermediate.fbx.receipt.json'), 'utf8')).sha256, first?.sha256)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
