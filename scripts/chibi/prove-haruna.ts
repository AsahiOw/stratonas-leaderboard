import 'dotenv/config'

import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'

import { prisma } from '../../src/lib/prisma'
import { chibiRoots } from '../../src/lib/chibi/storage'
import { convertCandidate } from '../../src/lib/chibi/engine'
import { acquireWorkerLock, claimNextJob, processJob, recoverExpiredLeases } from '../../src/lib/chibi/engine-db'
import type { InventoryEntry, InventoryFile, InventoryReport, SourceCandidate, SourcePart } from '../../src/lib/chibi/inventory'
import { enqueueChibiJob } from '../../src/lib/chibi/server'
import type { ChibiProfile } from '../../src/lib/chibi/types'

const archiveSelections: Array<[string, (name: string) => boolean]> = [
  ['AssetBundles/FullPatch_042.zip', name => name.toLowerCase().includes('haruna_original')],
  ['AssetBundles/FullPatch_124.zip', name => name.toLowerCase().includes('haruna_original')],
  ['AssetBundles/FullPatch_Prologue_000.zip', name => name === 'prologdepengroup-assets-_mx-characters-_mxcommon-_mxprolog-2025-07-02_assets_all_868884618.bundle'],
]
const clips = {
  idle: 'Haruna_Original_Cafe_Idle', walk: 'Haruna_Original_Cafe_Walk',
  pickup: 'Haruna_Original_Formation_Pickup', touch: 'Haruna_Original_Cafe_Reaction',
}
const mouthEvents = [
  [clips.idle, 0, 704], [clips.walk, 0, 704],
  [clips.pickup, 0, 704], [clips.pickup, 0.4333333671, 501], [clips.pickup, 1.4333333969, 704], [clips.pickup, 2.1666667461, 404],
  [clips.touch, 0, 704], [clips.touch, 0.3000000119, 707], [clips.touch, 1.2333334684, 300], [clips.touch, 1.26666677, 704],
].map(([clip, time, value]) => ({ clip: String(clip), time: Number(time), function: 'SetMouthTile', string: '', float: 0, int: Number(value) }))
const profile: ChibiProfile = {
  label: 'Haruna original café', initialPose: clips.idle, idleLabel: 'Café standing idle',
  interactions: {
    idle: { state: 'available', clip: clips.idle, loop: true },
    walk: { state: 'available', clip: clips.walk, loop: true },
    pickup: { state: 'available', clip: clips.pickup, hold: true },
    touch: { state: 'available', clip: clips.touch },
  },
}

async function proofInventory(): Promise<{ report: InventoryReport; candidate: SourceCandidate; dependencies: SourcePart[] }> {
  const source = chibiRoots().source
  const files: InventoryFile[] = []
  const parts: SourcePart[] = []
  const dependencies: SourcePart[] = []
  for (const [archivePath, select] of archiveSelections) {
    const bytes = await readFile(path.join(source, archivePath))
    const archiveSha256 = createHash('sha256').update(bytes).digest('hex')
    const zip = await JSZip.loadAsync(bytes)
    const entries: InventoryEntry[] = []
    for (const [entryPath, entry] of Object.entries(zip.files)) {
      if (entry.dir || !select(entryPath)) continue
      const member = await entry.async('nodebuffer')
      const sha256 = createHash('sha256').update(member).digest('hex')
      const entryCrc32 = ((entry as any)._data.crc32 >>> 0).toString(16).padStart(8, '0')
      entries.push({ path: entryPath, size: member.length, compressedSize: (entry as any)._data.compressedSize ?? member.length, crc32: entryCrc32, sha256 })
      const part: SourcePart = { archivePath, archiveSha256, entryPath, entrySize: member.length, entryCrc32, sha256, family: archivePath.includes('Prologue') ? 'shared' : archivePath.includes('124') ? 'load' : 'core', revision: entryPath.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null }
      ;(archivePath.includes('Prologue') ? dependencies : parts).push(part)
    }
    files.push({ path: archivePath, size: bytes.length, sha256: archiveSha256, kind: 'archive', entries })
  }
  const candidate: SourceCandidate = {
    sourceIdentity: 'haruna_original', fingerprint: createHash('sha256').update(parts.map(part => part.sha256).sort().join('\n')).digest('hex'),
    conflict: false, parts, families: ['core', 'load'], revisions: [...new Set(parts.flatMap(part => part.revision ? [part.revision] : []))].sort(),
    clips: Object.values(clips), objectNames: ['Cafe_Haruna_Original'],
    materials: ['MXCharacterGeneralV2', 'MXCharacterFaceV2', 'MXCharacterHairV2', 'MXCharacterHaloTex', 'MXCharacterEyebrowV2Simple', 'MXCharacterEyesMouthV2', 'MXWeapon'],
    dependencies: dependencies.map(part => part.entryPath), events: mouthEvents,
  }
  return { report: { version: 1, source, files, candidates: [candidate], errors: [] }, candidate, dependencies }
}

async function saveReport(payload: Record<string, unknown>) {
  const directory = path.join(chibiRoots().data, 'reports')
  await mkdir(directory, { recursive: true })
  const output = path.join(directory, `haruna-proof-${new Date().toISOString().replaceAll(':', '-')}.json`)
  const install = JSON.parse(await readFile(path.join(chibiRoots().tools, 'install.json'), 'utf8'))
  await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`, tools: install, ...payload }, null, 2))
  console.log(`Haruna proof report: ${output}`)
}

async function main() {
  const proof = await proofInventory()
  if (!process.argv.includes('--publish')) {
    const artifact = await convertCandidate({ candidate: proof.candidate, profile, dependencyParts: proof.dependencies })
    await saveReport({ mode: 'conversion-proof', profile, candidate: proof.candidate, dependencies: proof.dependencies, artifact })
    return
  }
  const lock = await acquireWorkerLock()
  if (!lock) throw new Error('Another chibi worker owns the import advisory lock.')
  try {
    await recoverExpiredLeases(prisma)
    const active = await prisma.chibiImportJob.findFirst({ where: { status: { in: ['queued', 'running'] } }, orderBy: { createdAt: 'asc' } })
    if (active) throw new Error(`Existing ${active.mode} job ${active.id} must finish before the Haruna publication proof.`)
    const queued = await enqueueChibiJob({ mode: 'update', requesterId: null, studentIds: [10002] })
    const job = await claimNextJob(prisma, `haruna-proof:${process.pid}`)
    if (!job || job.id !== queued.id) throw new Error('Haruna proof could not claim its durable job.')
    await Promise.race([processJob(prisma, job, proof.report), lock.lost])
    const completed = await prisma.chibiImportJob.findUniqueOrThrow({ where: { id: job.id }, include: { items: { include: { asset: true } } } })
    await saveReport({ mode: 'durable-publication-proof', profile, candidate: proof.candidate, dependencies: proof.dependencies, job: completed })
    if (completed.status !== 'completed' || completed.failed || !completed.items[0]?.asset?.published) throw new Error('Haruna durable publication did not complete successfully.')
  } finally {
    await lock.release()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
