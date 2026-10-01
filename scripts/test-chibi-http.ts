import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../src/lib/prisma'
import { artifactPath } from '../src/lib/chibi/storage'
import { validateGlb } from '../src/lib/chibi/engine'
import { assertAcceptanceEnvironment, assertOutsideNormalRoots, requireAbsolutePath } from './chibi-acceptance-guards'

async function main() {
  const base = process.env.CHIBI_TEST_ORIGIN || 'http://localhost:3000'
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Runtime delivery checks are local only.')
  assert.equal(process.env.CHIBI_TEST_ISOLATED, 'true', 'Runtime delivery checks write a temporary asset and require CHIBI_TEST_ISOLATED=true.')
  const dataDir = requireAbsolutePath('CHIBI_DATA_DIR', process.env.CHIBI_DATA_DIR)
  assertOutsideNormalRoots('CHIBI_DATA_DIR', dataDir)
  const databaseUrl = process.env.CHIBI_TEST_DATABASE_URL
  assert.ok(databaseUrl && databaseUrl === process.env.DATABASE_URL, 'Runtime delivery checks require CHIBI_TEST_DATABASE_URL to match the app DATABASE_URL.')
  assertAcceptanceEnvironment({ dataDir, databaseUrl, requireSource: false, allowTestDatabase: true })
  const id = `verification_${randomUUID().replaceAll('-', '')}`
  const fileKey = `work/${id}.glb`
  const file = artifactPath(fileKey)
  const bytes = await readFile('public/assets/chibi/haruna-original.glb')
  const checksum = createHash('sha256').update(bytes).digest('hex')
  const url = `${base}/assets/chibi/${id}/${checksum}.glb`
  try {
    const missing = await fetch(url)
    assert.equal(missing.status, 404)
    assert.match(missing.headers.get('Cache-Control') || '', /no-store/)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, bytes)
    const validation = await validateGlb(file)
    await prisma.chibiAsset.create({ data: { id, sourceIdentity: '__temporary_http_verification__', fingerprint: id, dependencyFingerprint: id, exporterVersion: 'verified-haruna-fixture', checksum, fileKey, validation: JSON.parse(JSON.stringify(validation)) } })
    assert.equal((await fetch(url)).status, 404, 'unpublished artifact must remain private')
    assert.equal((await fetch(`${base}/api/admin/chibi/assets/${id}/${checksum}.glb`)).status, 401)
    await prisma.chibiAsset.update({ where: { id }, data: { published: true } })
    const response = await fetch(url)
    assert.equal(response.status, 200, 'new runtime artifact must become accessible without rebuilding')
    assert.equal(response.headers.get('Content-Type'), 'model/gltf-binary')
    assert.match(response.headers.get('Cache-Control') || '', /immutable/)
    assert.equal(response.headers.get('ETag'), `"${checksum}"`)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes)
    assert.equal((await fetch(url, { headers: { 'If-None-Match': `"${checksum}"` } })).status, 304)
    const head = await fetch(url, { method: 'HEAD' })
    assert.equal(head.status, 200)
    assert.equal(Number(head.headers.get('Content-Length')), bytes.length)
    await prisma.chibiAsset.update({ where: { id }, data: { fileKey: '../outside-storage.glb' } })
    assert.equal((await fetch(url)).status, 404, 'a database key cannot escape runtime storage')
    console.log(`Runtime GLB HTTP checks passed at ${base}: private/public access, newly created artifact, MIME, immutable caching, ETag/304, HEAD, path containment.`)
  } finally {
    await prisma.chibiAsset.deleteMany({ where: { id } })
    await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error })
    await prisma.$disconnect()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
