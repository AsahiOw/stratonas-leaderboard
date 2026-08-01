import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const ARTIFACT_VERSION = 'v1'
const ARTIFACT_ROOT = path.join(process.cwd(), 'Development_data', 'plana-stats', 'artifacts')
const artifactWrites = new Map<string, Promise<unknown>>()

export type PlanaArtifactDataset = {
  region: string
  raidType: string
  raidDate: string
  dbEtag: string | null
  dbBytes: bigint | null
}

function safeSegment(value: string) {
  return encodeURIComponent(value).replaceAll('%', '_').replaceAll('.', '_')
}

function sourceVersion(dataset: PlanaArtifactDataset) {
  return createHash('sha256')
    .update(`${dataset.dbEtag || 'no-etag'}:${dataset.dbBytes?.toString() || 'unknown-size'}`)
    .digest('hex')
    .slice(0, 16)
}

function artifactPath(dataset: PlanaArtifactDataset, key: string) {
  const segments = key.split('/').map(safeSegment)
  return path.join(
    ARTIFACT_ROOT,
    ARTIFACT_VERSION,
    safeSegment(dataset.region),
    safeSegment(dataset.raidType),
    safeSegment(dataset.raidDate),
    sourceVersion(dataset),
    ...segments,
  ) + '.json'
}

async function readArtifact<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    await fs.rm(file, { force: true })
    return null
  }
}

async function atomicWriteJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.tmp-${randomUUID()}`
  try {
    await fs.writeFile(temporary, JSON.stringify(value), { encoding: 'utf8', flag: 'wx' })
    try {
      await fs.rename(temporary, file)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'EEXIST' && code !== 'EPERM') throw error
      await fs.rm(temporary, { force: true })
    }
  } catch (error) {
    await fs.rm(temporary, { force: true })
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
}

export async function getOrCreatePlanaArtifact<T>(
  dataset: PlanaArtifactDataset,
  key: string,
  create: () => Promise<T>,
): Promise<T> {
  const file = artifactPath(dataset, key)
  const existing = await readArtifact<T>(file)
  if (existing !== null) return existing

  const pending = artifactWrites.get(file) as Promise<T> | undefined
  if (pending) return pending

  const write = create().then(async (value) => {
    await atomicWriteJson(file, value)
    return value
  })
  artifactWrites.set(file, write)
  try {
    return await write
  } finally {
    if (artifactWrites.get(file) === write) artifactWrites.delete(file)
  }
}
