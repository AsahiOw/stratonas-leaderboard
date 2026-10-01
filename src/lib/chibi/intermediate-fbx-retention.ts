import { createHash } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import { copyFile, lstat, readdir, realpath, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'

export interface IntermediateFbxRetentionReceipt {
  schemaVersion: 1
  kind: 'chibi-intermediate-fbx-retention'
  sourceIdentity: string
  sourceFileName: string
  fileName: 'intermediate.fbx'
  bytes: number
  sha256: string
}

interface IntermediateFbxRetentionOptions {
  sourceFile: string
  directory?: string
  sourceIdentity: string
  forbiddenRoots: readonly string[]
}

function samePath(left: string, right: string) {
  const a = path.resolve(left)
  const b = path.resolve(right)
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

function containsPath(parent: string, child: string) {
  const relative = path.relative(parent, child)
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
}

function pathsOverlap(left: string, right: string) {
  return containsPath(left, right) || containsPath(right, left)
}

async function canonicalDirectory(directory: string, label: string) {
  if (!path.isAbsolute(directory)) throw new Error(`${label} must be an absolute path.`)
  const resolved = path.resolve(directory)
  const info = await lstat(resolved)
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`${label} must be an existing real directory.`)
  const canonical = await realpath(resolved)
  if (!samePath(canonical, resolved)) throw new Error(`${label} must use its canonical path.`)
  return canonical
}

async function hashRegularFile(file: string, label: string) {
  const before = await lstat(file)
  if (before.isSymbolicLink() || !before.isFile()) throw new Error(`${label} must be a regular file.`)
  const digest = createHash('sha256')
  let bytes = 0
  for await (const chunk of createReadStream(file)) {
    bytes += chunk.length
    digest.update(chunk)
  }
  const after = await lstat(file)
  if (after.size !== bytes || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
    throw new Error(`${label} changed while it was being copied or hashed.`)
  }
  return { bytes, sha256: digest.digest('hex') }
}

export async function retainIntermediateFbx(options: IntermediateFbxRetentionOptions): Promise<IntermediateFbxRetentionReceipt | null> {
  if (!options.directory) return null
  if (typeof options.sourceIdentity !== 'string' || !options.sourceIdentity.trim()) {
    throw new Error('Intermediate FBX retention requires a source identity.')
  }
  if (!path.isAbsolute(options.sourceFile)) throw new Error('Selected FBX path must be absolute for diagnostic retention.')
  if (!options.forbiddenRoots.length) throw new Error('Intermediate FBX retention requires guarded workspace roots.')

  const sourcePath = path.resolve(options.sourceFile)
  const sourceInfo = await lstat(sourcePath)
  if (sourceInfo.isSymbolicLink() || !sourceInfo.isFile()) throw new Error('Selected FBX must be a regular non-symlink file.')
  const sourceRealPath = await realpath(sourcePath)
  if (!samePath(sourceRealPath, sourcePath)) throw new Error('Selected FBX path must be canonical for diagnostic retention.')

  const targetDirectory = await canonicalDirectory(options.directory, 'Intermediate FBX diagnostic directory')
  for (const root of options.forbiddenRoots) {
    const canonicalRoot = await canonicalDirectory(root, 'Protected conversion root')
    if (pathsOverlap(targetDirectory, canonicalRoot)) {
      throw new Error('Intermediate FBX diagnostic directory overlaps a protected conversion root.')
    }
  }
  if (pathsOverlap(targetDirectory, sourceRealPath)) {
    throw new Error('Intermediate FBX diagnostic directory overlaps the selected FBX source.')
  }
  if ((await readdir(targetDirectory)).length !== 0) {
    throw new Error('Intermediate FBX diagnostic directory must be empty to preserve evidence without overwriting.')
  }

  const sourceBefore = await hashRegularFile(sourceRealPath, 'Selected FBX source')
  const fileName = 'intermediate.fbx' as const
  const retainedPath = path.join(targetDirectory, fileName)
  const receiptPath = path.join(targetDirectory, `${fileName}.receipt.json`)
  await copyFile(sourceRealPath, retainedPath, fsConstants.COPYFILE_EXCL)
  const [sourceAfter, retained] = await Promise.all([
    hashRegularFile(sourceRealPath, 'Selected FBX source'),
    hashRegularFile(retainedPath, 'Retained intermediate FBX'),
  ])
  if (sourceAfter.bytes !== sourceBefore.bytes || sourceAfter.sha256 !== sourceBefore.sha256
    || retained.bytes !== sourceBefore.bytes || retained.sha256 !== sourceBefore.sha256) {
    throw new Error('Retained intermediate FBX does not exactly match the selected AssetStudio output.')
  }

  const receipt: IntermediateFbxRetentionReceipt = {
    schemaVersion: 1,
    kind: 'chibi-intermediate-fbx-retention',
    sourceIdentity: options.sourceIdentity,
    sourceFileName: path.basename(sourceRealPath),
    fileName,
    bytes: retained.bytes,
    sha256: retained.sha256,
  }
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
  return receipt
}
