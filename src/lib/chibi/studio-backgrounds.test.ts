import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { getStudioBackgrounds, readStudioBackground } from './studio-backgrounds'

test('lists downloaded backgrounds including nested folders and reads only allowed files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'studio-backgrounds-'))
  try {
    await mkdir(path.join(root, 'CS'))
    await writeFile(path.join(root, 'BG_Classroom_Night.jpg'), 'jpeg')
    await writeFile(path.join(root, 'CS', 'BG_Beach.png'), 'png')
    await writeFile(path.join(root, 'private.txt'), 'private')
    const catalog = await getStudioBackgrounds(root)
    assert.equal(catalog.length, 2)
    assert.ok(catalog.some(b => b.key === 'CS/BG_Beach.png'))
    assert.ok(catalog.some(b => b.label === 'Classroom Night'))
    assert.equal((await readStudioBackground('BG_Classroom_Night.jpg', root)).data.toString(), 'jpeg')
    assert.equal((await readStudioBackground('CS/BG_Beach.png', root)).type, 'image/png')
    for (const key of ['../outside.jpg', '/outside.jpg', 'CS/../../outside.jpg', 'private.txt', 'C:\\outside.jpg', 'CS\\BG_Beach.png', 'missing.jpg']) await assert.rejects(readStudioBackground(key, root))
  } finally { await rm(root, { recursive: true, force: true }) }
})
