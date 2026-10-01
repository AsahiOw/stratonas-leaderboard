import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { outputStorageCheck, resolveChibiRoots, runChibiPreflight, sourceLayoutCheck, summarizePreflight } from './chibi-preflight'

test('summarizePreflight reports failures and keeps remediation', () => {
  const result = summarizePreflight([
    { id: 'source', label: 'source directory', ok: false, detail: 'missing', remediation: 'Restore BAAD.' },
    { id: 'node', label: 'Node.js', ok: true, detail: '22.0.0' },
  ], {
    checkedAt: new Date('2026-09-16T00:00:00.000Z'),
    platform: 'win32-x64',
    roots: { source: 'source', data: 'data', tools: 'tools' },
  })

  assert.equal(result.ready, false)
  assert.deepEqual(result.failures.map(check => check.id), ['source'])
  assert.equal(result.failures[0]?.remediation, 'Restore BAAD.')
  assert.equal(result.checkedAt, '2026-09-16T00:00:00.000Z')
})

test('source layout and output checks are read-only and actionable', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-preflight-'))
  try {
    const sourceRoot = path.join(root, 'BAAD')
    const dataRoot = path.join(root, 'chibi')
    const missingSource = await sourceLayoutCheck(sourceRoot)
    assert.equal(missingSource.ok, false)
    assert.match(missingSource.remediation || '', /CHIBI_SOURCE_DIR/)

    await mkdir(sourceRoot, { recursive: true })
    await mkdir(dataRoot, { recursive: true })
    for (const directory of ['AssetBundles', 'MediaResources', 'TableBundles']) await mkdir(path.join(sourceRoot, directory))
    assert.equal((await sourceLayoutCheck(sourceRoot)).ok, true)
    assert.equal((await outputStorageCheck(dataRoot)).ok, true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('tools-only preflight never probes source, storage, or database', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-preflight-'))
  try {
    const commands: string[] = []
    const result = await runChibiPreflight({
      roots: resolveChibiRoots(root),
      toolsOnly: true,
      manifest: null,
      installRecord: null,
      runCommand: async (command, args) => {
        commands.push(`${command} ${args.join(' ')}`)
        if (args.includes('--list-runtimes')) return { stdout: 'Microsoft.NETCore.App 9.0.0 [x]', stderr: '' }
        if (args.includes('--list-sdks')) return { stdout: '9.0.100 [x]', stderr: '' }
        if (args.includes('--version')) return { stdout: 'Python 3.12.0', stderr: '' }
        if (args.includes('-c')) return { stdout: '1.25.3', stderr: '' }
        throw new Error('unexpected command')
      },
    })

    assert.equal(result.checks.some(check => ['source', 'output', 'database'].includes(check.id)), false)
    assert.ok(commands.some(command => command.includes('--list-runtimes')))
    assert.ok(commands.some(command => command.includes('--list-sdks')))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
