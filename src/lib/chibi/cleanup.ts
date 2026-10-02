import { readdir, readFile, realpath, stat, unlink, rmdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { prisma } from '@/lib/prisma'
import { acquireWorkerLock } from './worker-lock'
import { CHIBI_ENQUEUE_LOCK, activeJobWhere, ChibiJobConflict } from './server'
import { artifactPath, chibiRoots } from './storage'

const RECENT_MS = 24 * 60 * 60 * 1000

async function exportedFiles(root: string) {
  const keep = new Set<string>()
  let folders
  try { folders = await readdir(root, { withFileTypes: true }) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return keep; throw error }
  for (const folder of folders) {
    if (folder.isSymbolicLink()) throw new Error('Cleanup cannot inspect an export folder symlink.')
    if (!folder.isDirectory()) continue
    const recordsPath = join(root, folder.name, 'records.json')
    const records = JSON.parse(await readFile(recordsPath, 'utf8'))
    if (records.format !== 'stratonas-chibi-records' || records.schemaVersion !== 1 || !Array.isArray(records.assets)) throw new Error(`Invalid saved export: ${folder.name}. Cleanup stopped.`)
    for (const asset of records.assets) {
      if (typeof asset.fileKey !== 'string' || !asset.fileKey.startsWith('published/')) throw new Error(`Invalid model path in saved export: ${folder.name}. Cleanup stopped.`)
      artifactPath(asset.fileKey)
      keep.add(asset.fileKey)
    }
  }
  return keep
}

// Call only while holding the worker's global lock. The enqueue transaction
// lock also prevents a database transfer or new job from racing deletion.
export async function cleanupChibiFiles(db = prisma, dataRoot = chibiRoots().data, exportRoot = resolve('Development_data/chibi-record-exports'), now = Date.now()) {
  const keepExports = await exportedFiles(exportRoot)
  const root = await realpath(dataRoot)
  const published = join(root, 'published')
  let publishedRoot
  try { publishedRoot = await realpath(published) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { removedFiles: 0, freedBytes: 0, skipped: false }; throw error }
  if (publishedRoot !== published) throw new Error('Published models must not be a symlink outside their storage folder.')
  const files: { path: string; key: string; bytes: number; modified: number }[] = []
  const directories: string[] = []
  const scan = async (directory: string) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error('Cleanup refuses symlinks inside published models.')
      if (entry.isDirectory()) { await scan(file); directories.push(file) }
      else if (entry.isFile() && entry.name.endsWith('.glb')) {
        const info = await stat(file)
        files.push({ path: file, key: relative(root, file).split(sep).join('/'), bytes: info.size, modified: info.mtimeMs })
      }
    }
  }
  await scan(published)
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHIBI_ENQUEUE_LOCK})`
    if (await tx.chibiImportJob.findFirst({ where: activeJobWhere, select: { id: true } })) return { removedFiles: 0, freedBytes: 0, skipped: true }
    const assets = await tx.chibiAsset.findMany({ select: { id: true, fileKey: true, published: true, _count: { select: { bindings: true } } } })
    const keep = new Set(keepExports)
    for (const asset of assets) if (asset._count.bindings > 0 || !asset.published) keep.add(asset.fileKey)
    // Files not registered in this database may be models copied to a new
    // server before their records are imported. Leave those transfers alone.
    const registered = new Set(assets.map(asset => asset.fileKey))
    const obsolete = files.filter(file => registered.has(file.key) && !keep.has(file.key) && file.modified < now - RECENT_MS)
    const obsoleteKeys = new Set(obsolete.map(file => file.key))
    const ids = assets.filter(asset => obsoleteKeys.has(asset.fileKey)).map(asset => asset.id)
    // Keep job diagnostics and timings, but detach historical model revisions.
    await tx.chibiImportItem.updateMany({ where: { assetId: { in: ids } }, data: { assetId: null } })
    const deleted = await tx.chibiAsset.deleteMany({ where: { id: { in: ids }, bindings: { none: {} } } })
    if (deleted.count !== ids.length) throw new Error('Model bindings changed during cleanup; file deletion stopped.')
    let freedBytes = 0
    for (const file of obsolete) { await unlink(file.path); freedBytes += file.bytes }
    for (const directory of directories) {
      try { await rmdir(directory) }
      catch (error) { if (!['ENOTEMPTY', 'EEXIST', 'ENOENT'].includes((error as NodeJS.ErrnoException).code || '')) throw error }
    }
    return { removedFiles: obsolete.length, freedBytes, skipped: false }
  }, { maxWait: 30_000, timeout: 120_000 })
}

export async function runChibiCleanup() {
  const lock = await acquireWorkerLock()
  if (!lock) throw new ChibiJobConflict('worker-busy')
  try {
    const result = await cleanupChibiFiles()
    if (result.skipped) throw new ChibiJobConflict('queued-import')
    return result
  } finally { await lock.release() }
}
