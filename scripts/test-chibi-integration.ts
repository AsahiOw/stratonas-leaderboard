import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Client } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { prisma } from '../src/lib/prisma'
import { controlChibiJob, enqueueChibiJob, getPublicChibiStudents, jsonValue } from '../src/lib/chibi/server'
import { acquireWorkerLock, claimNextJob, pauseAtCheckpoint, recoverExpiredLeases, renewLease, fencedPublish } from '../src/lib/chibi/engine-db'
import { publishArtifact } from '../src/lib/chibi/engine'
import { serveChibiArtifact } from '../src/lib/chibi/serve'
import { emptyChibiProfile } from '../src/lib/chibi/types'

async function main() {
  // Real PostgreSQL constraints/locks are exercised in an isolated disposable schema.
  const schema = `chibi_test_${randomUUID().replaceAll('-', '')}`
  assert.match(schema, /^chibi_test_[a-f0-9]{32}$/)
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'chibi integration '))
  const oldDataRoot = process.env.CHIBI_DATA_DIR
  process.env.CHIBI_DATA_DIR = dataRoot
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` }, { schema }), transactionOptions: { maxWait: 10000, timeout: 15000 } })
  try {
    await client.query(`CREATE SCHEMA "${schema}"`)
    await client.query(`SET search_path TO "${schema}"`)
    const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.prisma', '--script'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    await client.query(sql)
    await db.student.createMany({ data: [
      { id: 10002, name: 'Haruna', pathName: 'haruna', image: '/portrait.png' },
      { id: 10143, name: 'Shun', pathName: 'shun_swimsuit', image: '/portrait.png' },
      { id: 10144, name: 'Shun', pathName: 'shunling_swimsuit', image: '/portrait.png' },
      { id: 999, name: 'Custom', pathName: 'custom', image: '/portrait.png' },
    ] })
    assert.equal((await getPublicChibiStudents(db)).length, 0, 'unimported students must not appear in the public catalog')
    const attempts = await Promise.allSettled([1, 2].map(() => enqueueChibiJob({ mode: 'update', requesterId: null, studentIds: [] }, db)))
    assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1, `concurrent bulk enqueues must serialize: ${attempts.filter(result => result.status === 'rejected').map(result => result.reason.message).join('; ')}`)
    const rejection = attempts.find(result => result.status === 'rejected') as PromiseRejectedResult
    assert.match(rejection.reason.message, /already active/)
    const queued = await db.chibiImportJob.findFirstOrThrow({ where: { status: 'queued' } })
    assert.equal((await controlChibiJob(queued.id, 'pause', db)).status, 'paused')
    assert.equal(await claimNextJob(db, 'paused-worker'), null, 'paused jobs cannot be claimed')
    await assert.rejects(() => enqueueChibiJob({ mode: 'update', requesterId: null, studentIds: [] }, db), /already active/)
    await db.$disconnect()
    await db.$connect()
    assert.equal((await db.chibiImportJob.findUniqueOrThrow({ where: { id: queued.id } })).status, 'paused', 'pause survives restarting the database client')
    await controlChibiJob(queued.id, 'resume', db)
    const claimed = await claimNextJob(db, 'integration-worker')
    assert.ok(claimed?.leaseToken)
    await db.chibiImportItem.create({ data: { jobId: claimed.id, studentId: 10002, status: 'skipped', stage: 'complete' } })
    await db.chibiImportItem.create({ data: { jobId: claimed.id, studentId: 10143, status: 'running' } })
    assert.equal((await controlChibiJob(claimed.id, 'pause', db)).stage, 'pause-requested')
    await renewLease(db, claimed.id, claimed.leaseToken, new Date(Date.now() - 180000))
    await recoverExpiredLeases(db)
    assert.equal((await db.chibiImportJob.findUniqueOrThrow({ where: { id: claimed.id } })).status, 'paused', 'a worker restart must honor a pending pause instead of auto-resuming')
    assert.equal(await claimNextJob(db, 'paused-recovery-worker'), null)
    await controlChibiJob(claimed.id, 'resume', db)
    const afterPause = await claimNextJob(db, 'resumed-worker')
    assert.notEqual(afterPause.leaseToken, claimed.leaseToken)
    await controlChibiJob(claimed.id, 'pause', db)
    assert.equal(await pauseAtCheckpoint(db, claimed.id, afterPause.leaseToken), true)
    await assert.rejects(() => renewLease(db, claimed.id, afterPause.leaseToken), /lease was lost/)
    await controlChibiJob(claimed.id, 'resume', db)
    const afterCheckpoint = await claimNextJob(db, 'checkpoint-worker')
    assert.notEqual(afterCheckpoint.leaseToken, afterPause.leaseToken)
    if (process.argv.includes('--pause-only')) {
      assert.equal((await db.chibiImportItem.findFirstOrThrow({ where: { jobId: claimed.id, studentId: 10002 } })).status, 'skipped')
      assert.equal((await db.chibiImportItem.findFirstOrThrow({ where: { jobId: claimed.id, studentId: 10143 } })).status, 'running')
      console.log('Chibi pause/resume PostgreSQL integration passed: queued pause, duplicate-import blocking, persistence after reconnect, requested-pause recovery, checkpoint pause, fresh resume leases, and retained item results. Live imports were not changed.')
      return
    }
    await db.chibiImportJob.update({ where: { id: claimed.id }, data: { heartbeatAt: new Date(Date.now() - 180000) } })
    await recoverExpiredLeases(db)
    const reclaimed = await claimNextJob(db, 'replacement-worker')
    assert.notEqual(reclaimed.leaseToken, claimed.leaseToken)
    assert.equal((await db.chibiImportItem.findFirst({ where: { jobId: claimed.id, studentId: 10002 } }))?.status, 'skipped', 'recovery must retain completed items')
    await assert.rejects(() => renewLease(db, claimed.id, claimed.leaseToken), /lease was lost/)
    const fixture = path.resolve('public/assets/chibi/haruna-original.glb')
    const artifact = await publishArtifact(fixture, dataRoot)
    const item = await db.chibiImportItem.findFirstOrThrow({ where: { jobId: claimed.id, studentId: 10002 } })
    const candidate = { sourceIdentity: 'haruna_original', fingerprint: 'source', conflict: false, parts: [], families: [], revisions: [], clips: artifact.validation.animations, objectNames: [], materials: [], dependencies: [], events: [] }
    const input = { jobId: claimed.id, leaseToken: claimed.leaseToken, itemId: item.id, student: { id: 10002, name: 'Haruna', pathName: 'haruna' }, candidate, profile: emptyChibiProfile(), fingerprint: 'fixture', artifact: { ...artifact, clips: artifact.validation.animations }, dependencyFingerprint: 'source', provenance: 'canonical', identityPath: 'haruna', overrides: {} }
    await assert.rejects(() => fencedPublish(db, input), /lease was lost/)
    assert.equal(await db.chibiAsset.count(), 0, 'lost lease must not write asset')
    const published = await fencedPublish(db, { ...input, leaseToken: reclaimed.leaseToken })
    assert.equal((await getPublicChibiStudents(db)).length, 1, 'only the published character appears in the public catalog')
    assert.equal((await getPublicChibiStudents(db)).find(row => row.id === 10002)?.model?.assetId, published.id)
    // Simulate a process restart: the durable binding and immutable artifact
    // must survive a disconnected Prisma client before the next import.
    await db.$disconnect()
    await db.$connect()
    const afterRestart = await db.studentChibiBinding.findUniqueOrThrow({ where: { studentId: 10002 }, include: { asset: true } })
    assert.equal(afterRestart.assetId, published.id)
    assert.equal(afterRestart.asset?.checksum, published.checksum)
    assert.equal((await readFile(path.join(dataRoot, published.fileKey))).toString('ascii', 0, 4), 'glTF')
    await db.chibiImportJob.update({ where: { id: claimed.id }, data: { status: 'failed' } })
    // A repeat update after the restart may reuse the intact immutable
    // revision. It must not create a duplicate asset or overwrite its file.
    const repeatJob = await enqueueChibiJob({ mode: 'update', requesterId: null, studentIds: [10002] }, db)
    const repeatClaimed = await claimNextJob(db, 'repeat-worker')
    assert.equal(repeatClaimed?.id, repeatJob.id)
    const repeatItem = await db.chibiImportItem.create({ data: { jobId: repeatJob.id, studentId: 10002 } })
    const repeatBinding = await db.studentChibiBinding.findUniqueOrThrow({ where: { studentId: 10002 } })
    const assetCountBeforeRepeat = await db.chibiAsset.count()
    const repeated = await fencedPublish(db, {
      ...input, jobId: repeatJob.id, itemId: repeatItem.id, leaseToken: repeatClaimed.leaseToken,
      expectedBindingUpdatedAt: repeatBinding.updatedAt, existingAssetId: published.id, resultStatus: 'reused',
    })
    assert.equal(repeated.id, published.id)
    assert.equal(await db.chibiAsset.count(), assetCountBeforeRepeat)
    assert.equal((await readFile(path.join(dataRoot, published.fileKey))).toString('ascii', 0, 4), 'glTF')
    await db.chibiImportJob.update({ where: { id: repeatJob.id }, data: { status: 'completed', stage: 'completed', completedAt: new Date() } })
    assert.equal((await db.studentChibiBinding.findUniqueOrThrow({ where: { studentId: 10002 } })).assetId, published.id, 'failed job retains working asset')
    const revision = `${published.checksum}.glb`
    const response = await serveChibiArtifact(new Request('http://localhost/model'), published.id, revision, false, db)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Type'), 'model/gltf-binary')
    assert.match(response.headers.get('Cache-Control')!, /immutable/)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(fixture))
    const cached = await serveChibiArtifact(new Request('http://localhost/model', { headers: { 'If-None-Match': `"${published.checksum}"` } }), published.id, revision, false, db)
    assert.equal(cached.status, 304)
    const privateAsset = await db.chibiAsset.create({ data: { sourceIdentity: 'preview', fingerprint: 'preview', dependencyFingerprint: 'source', exporterVersion: 'fixture', checksum: published.checksum, fileKey: published.fileKey, validation: { valid: true } } })
    assert.equal((await serveChibiArtifact(new Request('http://localhost/model'), privateAsset.id, revision, false, db)).status, 404)
    const privateResponse = await serveChibiArtifact(new Request('http://localhost/model'), privateAsset.id, revision, true, db)
    assert.equal(privateResponse.status, 200)
    assert.equal(privateResponse.headers.get('Cache-Control'), 'private, no-store')
    await privateResponse.arrayBuffer()

    await db.chibiImportJob.update({ where: { id: reclaimed.id }, data: { status: 'running' } })
    const beforeApproval = await db.studentChibiBinding.findUniqueOrThrow({ where: { studentId: 10002 } })
    const approvedProfile = { ...emptyChibiProfile(), label: 'Reviewed profile' }
    await db.studentChibiBinding.update({ where: { studentId: 10002 }, data: {
      provenance: 'manual', overrides: jsonValue({ sourceIdentity: candidate.sourceIdentity, identityPath: 'haruna', approvedCandidateFingerprint: candidate.fingerprint, profile: approvedProfile }),
      updatedAt: new Date(beforeApproval.updatedAt.getTime() + 1),
    } })
    const approved = await db.studentChibiBinding.findUniqueOrThrow({ where: { studentId: 10002 } })
    const assetsBeforeApproval = await db.chibiAsset.count()
    await assert.rejects(() => fencedPublish(db, { ...input, leaseToken: reclaimed.leaseToken, expectedBindingUpdatedAt: beforeApproval.updatedAt }), /approval changed/)
    assert.equal(await db.chibiAsset.count(), assetsBeforeApproval, 'stale approval cannot leave an asset record behind')
    assert.deepEqual((await db.studentChibiBinding.findUniqueOrThrow({ where: { studentId: 10002 } })).overrides, approved.overrides)

    await db.student.update({ where: { id: 10002 }, data: { name: 'Renamed Haruna' } })
    assert.equal((await getPublicChibiStudents(db)).find(row => row.id === 10002)?.model?.assetId, published.id, 'display name changes preserve approved identity')
    await db.student.update({ where: { id: 10002 }, data: { pathName: 'haruna_different_outfit' } })
    assert.equal((await getPublicChibiStudents(db)).find(row => row.id === 10002), undefined, 'changed identity path must not display the old outfit')
    await assert.rejects(() => fencedPublish(db, { ...input, leaseToken: reclaimed.leaseToken, expectedBindingUpdatedAt: approved.updatedAt }), /identity changed during conversion/)
    await db.student.update({ where: { id: 10002 }, data: { pathName: 'haruna' } })

    const approvedInput = { ...input, leaseToken: reclaimed.leaseToken, expectedBindingUpdatedAt: approved.updatedAt, provenance: 'manual', overrides: approved.overrides, profile: approvedProfile }
    const concurrentPublications = await Promise.allSettled([1, 2].map(() => fencedPublish(db, approvedInput)))
    assert.equal(concurrentPublications.filter(result => result.status === 'fulfilled').length, 1, 'only one conversion can publish against the same binding snapshot')
    assert.equal(await db.chibiAsset.count(), assetsBeforeApproval + 1, 'losing publication rolls back its asset; successful rebuild preserves the prior immutable revision')
    const rebuiltBinding = await db.studentChibiBinding.findUniqueOrThrow({ where: { studentId: 10002 } })
    assert.notEqual(rebuiltBinding.assetId, published.id)
    assert.ok(await db.chibiAsset.findUnique({ where: { id: published.id } }), 'rebuild must retain the old published revision')
    const reused = await fencedPublish(db, { ...approvedInput, expectedBindingUpdatedAt: rebuiltBinding.updatedAt, existingAssetId: rebuiltBinding.assetId!, resultStatus: 'reused', profile: { ...approvedProfile, label: 'Playback-only change' } })
    assert.equal(reused.id, rebuiltBinding.assetId)
    assert.equal(await db.chibiAsset.count(), assetsBeforeApproval + 1, 'profile-only publication reuses its immutable artifact')
    assert.equal((await getPublicChibiStudents(db)).find(row => row.id === 10002)?.model?.profile.label, 'Playback-only change')
    const lock = await acquireWorkerLock()
    if (!lock) throw new Error('An import worker owns the advisory lock; rerun integration checks when it is idle.')
    try { assert.equal(await acquireWorkerLock(), null, 'a second worker must not acquire the dedicated lock') } finally { await lock.release() }
    console.log('Chibi PostgreSQL integration passed: concurrent enqueue/publication, lease recovery/fencing, durable binding/artifact after client restart, safe repeat reuse, approval races, identity/name changes, immutable revisions, profile reuse, retained completed items/revision, eligible catalog, private artifacts, runtime GLB/ETag, advisory lock.')
  } finally {
    await db.$disconnect()
    await client.query('SET search_path TO public')
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    await client.end()
    await prisma.$disconnect()
    if (oldDataRoot === undefined) delete process.env.CHIBI_DATA_DIR
    else process.env.CHIBI_DATA_DIR = oldDataRoot
    await rm(dataRoot, { recursive: true, force: true })
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
