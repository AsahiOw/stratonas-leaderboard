import { createWriteStream } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { Readable, Transform } from 'stream'
import { pipeline } from 'stream/promises'
import { randomUUID } from 'crypto'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { precomputePlanaRaidArtifacts } from '@/lib/plana-public'
import {
  parsePlanaManifest,
  selectPlanaImportCandidates,
  type PlanaImportMode,
  type PlanaManifestEntry,
} from '@/lib/plana-manifest'

export const PLANA_IMPORT_ID = 'plana-stats'

const PLANA_BASE_URL = 'https://d10ckrrtuobdz8.cloudfront.net/v2/'
const PLANA_DATA_ROOT = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  'Development_data',
  'plana-stats'
)
const PLANA_V2_DATA_ROOT = path.join(PLANA_DATA_ROOT, 'v2')
const MANIFEST_PATH = path.join(PLANA_V2_DATA_ROOT, 'manifest.json')
const MANIFEST_MAX_BYTES = 5 * 1024 * 1024
const DATABASE_MAX_BYTES = 128 * 1024 * 1024
const PARQUET_MAX_BYTES = 512 * 1024 * 1024
const MANIFEST_TIMEOUT_MS = 30_000
const DOWNLOAD_TIMEOUT_MS = 120_000

type DownloadResult = {
  localPath: string
  etag: string | null
  bytes: bigint
}

export function defaultPlanaImportState() {
  return {
    id: PLANA_IMPORT_ID,
    status: 'idle',
    stage: 'idle',
    mode: 'new',
    total: 0,
    processed: 0,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    currentDataset: null as string | null,
    message: null as string | null,
    error: null as string | null,
    manifestSchemaVersion: null as number | null,
    startedAt: null as Date | null,
    completedAt: null as Date | null,
    lastSuccessfulSyncAt: null as Date | null,
  }
}

export async function getPlanaImportState() {
  return (await prisma.planaImportState.findUnique({
    where: { id: PLANA_IMPORT_ID },
  })) || defaultPlanaImportState()
}

export async function getPlanaImportStatus() {
  const [state, total, ready, failed, recent, emergingCandidates] = await Promise.all([
    getPlanaImportState(),
    prisma.planaDataset.count(),
    prisma.planaDataset.count({ where: { status: 'ready' } }),
    prisma.planaDataset.count({ where: { status: 'failed' } }),
    prisma.planaDataset.findMany({
      orderBy: [{ downloadedAt: 'desc' }, { raidDate: 'desc' }],
      take: 10,
      select: {
        id: true,
        region: true,
        raidType: true,
        raidDate: true,
        season: true,
        label: true,
        status: true,
        error: true,
        downloadedAt: true,
      },
    }),
    prisma.planaDataset.findMany({
      where: { status: 'ready', region: 'JP' },
      orderBy: { raidDate: 'desc' },
      select: {
        region: true,
        raidType: true,
        raidDate: true,
        season: true,
        label: true,
        terrain: true,
      },
    }),
  ])

  return {
    ...state,
    datasets: { total, ready, failed },
    recent,
    emergingCandidates: emergingCandidates.map((dataset) => ({
      ...dataset,
      id: `${dataset.region}:${dataset.raidType}:${dataset.raidDate}`,
    })),
  }
}

async function ensurePlanaImportState() {
  await prisma.planaImportState.upsert({
    where: { id: PLANA_IMPORT_ID },
    update: {},
    create: { id: PLANA_IMPORT_ID },
  })
}

export async function startPlanaImport(mode: PlanaImportMode = 'new') {
  await ensurePlanaImportState()

  const lock = await prisma.planaImportState.updateMany({
    where: { id: PLANA_IMPORT_ID, NOT: { status: 'running' } },
    data: {
      status: 'running',
      stage: 'Loading manifest',
      mode,
      total: 0,
      processed: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0,
      currentDataset: null,
      message: 'Loading Plana manifest.',
      error: null,
      manifestSchemaVersion: null,
      startedAt: new Date(),
      completedAt: null,
    },
  })

  if (lock.count === 0) return false

  void runPlanaImport(mode)
  return true
}

async function runPlanaImport(mode: PlanaImportMode) {
  let processed = 0
  let downloaded = 0
  let failed = 0

  try {
    const manifestText = await fetchText(
      `${PLANA_BASE_URL}manifest.json`,
      MANIFEST_MAX_BYTES,
      MANIFEST_TIMEOUT_MS
    )
    const manifest = parsePlanaManifest(JSON.parse(manifestText))
    await atomicWriteText(MANIFEST_PATH, manifestText)
    await updateState({
      stage: 'Checking for updates',
      manifestSchemaVersion: manifest.schemaVersion,
      message: 'Comparing the Plana manifest with downloaded datasets.',
    })

    const existing = await prisma.planaDataset.findMany({
      select: {
        region: true,
        raidType: true,
        raidDate: true,
        dbRemotePath: true,
        parquetRemotePath: true,
        dbLocalPath: true,
        parquetLocalPath: true,
        dbEtag: true,
        parquetEtag: true,
        status: true,
      },
    })
    const checkedExisting = await Promise.all(existing.map(async (dataset) => ({
      ...dataset,
      status: dataset.status === 'ready'
        && await storedFileExists(dataset.dbLocalPath)
        && await storedFileExists(dataset.parquetLocalPath)
        ? 'ready'
        : 'missing',
    })))
    const updateCheckedExisting = await checkLatestDatasetUpdates(
      manifest.entries,
      checkedExisting
    )
    const selection = selectPlanaImportCandidates(
      manifest.entries,
      updateCheckedExisting,
      mode
    )

    await updateState({
      stage: selection.candidates.length ? 'Downloading datasets' : 'Completed',
      manifestSchemaVersion: manifest.schemaVersion,
      total: selection.candidates.length,
      skipped: selection.skipped,
      message: selection.candidates.length
        ? `Downloading ${selection.candidates.length} Plana dataset(s).`
        : 'No new Plana datasets were found.',
    })

    for (const entry of selection.candidates) {
      const currentDataset = datasetLabel(entry)
      await updateState({
        stage: 'Preparing dataset',
        currentDataset,
        message: `Downloading ${currentDataset}.`,
      })

      try {
        await importDataset(entry, manifest.schemaVersion)
        downloaded += 1
      } catch (error) {
        failed += 1
        const reason = errorMessage(error)
        await prisma.planaDataset.updateMany({
          where: {
            region: entry.region,
            raidType: entry.raidType,
            raidDate: entry.raidDate,
          },
          data: {
            status: 'failed',
            error: reason,
          },
        })
      }

      processed += 1
      await updateState({ processed, downloaded, failed })
    }

    const completedAt = new Date()
    if (downloaded > 0) {
      await prisma.planaImportState.update({
        where: { id: PLANA_IMPORT_ID },
        data: {
          emergingTotalRaidId: null,
          emergingGrandRaidId: null,
        },
      })
    }
    await updateState({
      status: failed ? 'failed' : 'completed',
      stage: failed ? 'Completed with errors' : 'Completed',
      currentDataset: null,
      message: failed
        ? `Downloaded ${downloaded} dataset(s); ${failed} failed.`
        : `Downloaded ${downloaded} dataset(s).`,
      error: failed ? `${failed} Plana dataset download(s) failed.` : null,
      completedAt,
      ...(failed ? {} : { lastSuccessfulSyncAt: completedAt }),
    })
  } catch (error) {
    await updateState({
      status: 'failed',
      stage: 'Failed',
      currentDataset: null,
      message: 'Plana import failed.',
      error: errorMessage(error),
      processed,
      downloaded,
      failed,
      completedAt: new Date(),
    })
  }
}

async function importDataset(entry: PlanaManifestEntry, manifestSchemaVersion: number) {
  await prisma.planaDataset.upsert({
    where: {
      region_raidType_raidDate: {
        region: entry.region,
        raidType: entry.raidType,
        raidDate: entry.raidDate,
      },
    },
    update: {
      ...datasetMetadata(entry, manifestSchemaVersion),
      status: 'downloading',
      error: null,
    },
    create: {
      ...datasetMetadata(entry, manifestSchemaVersion),
      status: 'downloading',
    },
  })

  await updateState({
    stage: 'Downloading formations',
    message: `Downloading formation database for ${datasetLabel(entry)}.`,
  })
  const database = await downloadFile(entry.dbRemotePath, DATABASE_MAX_BYTES)
  await updateState({
    stage: 'Downloading scores',
    message: `Downloading full score data for ${datasetLabel(entry)}.`,
  })
  const parquet = await downloadFile(entry.parquetRemotePath, PARQUET_MAX_BYTES)

  await updateState({
    stage: 'Saving dataset',
    message: `Saving ${datasetLabel(entry)}.`,
  })
  await prisma.planaDataset.update({
    where: {
      region_raidType_raidDate: {
        region: entry.region,
        raidType: entry.raidType,
        raidDate: entry.raidDate,
      },
    },
    data: {
      dbLocalPath: database.localPath,
      parquetLocalPath: parquet.localPath,
      dbEtag: database.etag,
      parquetEtag: parquet.etag,
      dbBytes: database.bytes,
      parquetBytes: parquet.bytes,
      status: 'preprocessing',
      error: null,
      downloadedAt: new Date(),
    },
  })

  await updateState({
    stage: 'Preparing raid responses',
    message: `Preparing cached responses for ${datasetLabel(entry)}.`,
  })
  await precomputePlanaRaidArtifacts({
    region: entry.region,
    raidType: entry.raidType,
    raidDate: entry.raidDate,
  })
  await prisma.planaDataset.update({
    where: {
      region_raidType_raidDate: {
        region: entry.region,
        raidType: entry.raidType,
        raidDate: entry.raidDate,
      },
    },
    data: { status: 'ready' },
  })
}

async function checkLatestDatasetUpdates<
  T extends {
    region: string
    raidType: string
    raidDate: string
    dbRemotePath: string
    parquetRemotePath: string
    dbEtag: string | null
    parquetEtag: string | null
    status: string
  }
>(entries: PlanaManifestEntry[], existing: T[]) {
  const manifestKeys = new Set(entries.map((entry) => datasetIdentity(entry)))
  const latestByGroup = new Map<string, T>()

  for (const dataset of existing) {
    if (dataset.status !== 'ready' || !manifestKeys.has(datasetIdentity(dataset))) continue
    const key = `${dataset.region}:${dataset.raidType}`
    const current = latestByGroup.get(key)
    if (!current || dataset.raidDate > current.raidDate) latestByGroup.set(key, dataset)
  }

  const changedKeys = new Set<string>()
  await Promise.all([...latestByGroup.values()].map(async (dataset) => {
    const [dbEtag, parquetEtag] = await Promise.all([
      fetchRemoteEtag(dataset.dbRemotePath),
      fetchRemoteEtag(dataset.parquetRemotePath),
    ])
    const databaseChanged = Boolean(dbEtag && dbEtag !== dataset.dbEtag)
    const parquetChanged = Boolean(parquetEtag && parquetEtag !== dataset.parquetEtag)
    if (databaseChanged || parquetChanged) changedKeys.add(datasetIdentity(dataset))
  }))

  return existing.map((dataset) => (
    changedKeys.has(datasetIdentity(dataset))
      ? { ...dataset, status: 'changed' }
      : dataset
  ))
}

async function fetchRemoteEtag(remotePath: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), MANIFEST_TIMEOUT_MS)
  try {
    const response = await fetch(new URL(remotePath, PLANA_BASE_URL), {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    })
    return response.ok ? response.headers.get('etag') : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function datasetMetadata(entry: PlanaManifestEntry, manifestSchemaVersion: number) {
  return {
    region: entry.region,
    raidType: entry.raidType,
    raidDate: entry.raidDate,
    season: entry.season,
    label: entry.label,
    internalName: entry.internalName,
    terrain: entry.terrain,
    source: entry.source,
    maxDifficulty: entry.maxDifficulty,
    armors: entry.armors ?? Prisma.JsonNull,
    difficulties: entry.difficulties ?? Prisma.JsonNull,
    startAt: entry.startAt,
    endAt: entry.endAt,
    manifestSchemaVersion,
    dbRemotePath: entry.dbRemotePath,
    parquetRemotePath: entry.parquetRemotePath,
  }
}

async function downloadFile(remotePath: string, maxBytes: number): Promise<DownloadResult> {
  const target = localFilePath(remotePath)
  const localPath = path.posix.join('v2', remotePath)
  await fs.mkdir(path.dirname(target), { recursive: true })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)
  const tempPath = `${target}.tmp-${randomUUID()}`

  try {
    const response = await fetch(new URL(remotePath, PLANA_BASE_URL), {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Plana download failed with ${response.status}: ${remotePath}`)
    }
    if (!response.body) throw new Error(`Plana download returned no body: ${remotePath}`)

    const contentLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error(`Plana file exceeds the size limit: ${remotePath}`)
    }

    let bytes = 0
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        bytes += chunk.length
        if (bytes > maxBytes) {
          callback(new Error(`Plana file exceeds the size limit: ${remotePath}`))
          return
        }
        callback(null, chunk)
      },
    })
    const body = Readable.fromWeb(
      response.body as unknown as import('stream/web').ReadableStream<Uint8Array>
    )
    await pipeline(body, limiter, createWriteStream(tempPath, { flags: 'wx' }))
    await replaceFile(tempPath, target)

    return {
      localPath,
      etag: response.headers.get('etag'),
      bytes: BigInt(bytes),
    }
  } catch (error) {
    await fs.rm(tempPath, { force: true })
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchText(url: string, maxBytes: number, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!response.ok) throw new Error(`Plana manifest request failed with ${response.status}.`)
    const text = await response.text()
    if (Buffer.byteLength(text) > maxBytes) throw new Error('Plana manifest exceeds the size limit.')
    return text
  } finally {
    clearTimeout(timeout)
  }
}

function localFilePath(remotePath: string) {
  const target = path.resolve(PLANA_V2_DATA_ROOT, ...remotePath.split('/'))
  const root = `${path.resolve(PLANA_V2_DATA_ROOT)}${path.sep}`
  if (!target.startsWith(root)) throw new Error(`Unsafe Plana local path: ${remotePath}`)
  return target
}

function storedLocalFilePath(localPath: string) {
  const target = path.resolve(PLANA_DATA_ROOT, ...localPath.split('/'))
  const root = `${path.resolve(PLANA_DATA_ROOT)}${path.sep}`
  if (!target.startsWith(root)) throw new Error(`Unsafe stored Plana path: ${localPath}`)
  return target
}

async function storedFileExists(localPath: string | null) {
  if (!localPath) return false
  try {
    return (await fs.stat(storedLocalFilePath(localPath))).isFile()
  } catch {
    return false
  }
}

async function atomicWriteText(target: string, contents: string) {
  await fs.mkdir(path.dirname(target), { recursive: true })
  const tempPath = `${target}.tmp-${randomUUID()}`
  try {
    await fs.writeFile(tempPath, contents, { encoding: 'utf8', flag: 'wx' })
    await replaceFile(tempPath, target)
  } catch (error) {
    await fs.rm(tempPath, { force: true })
    throw error
  }
}

async function replaceFile(source: string, target: string) {
  try {
    await fs.rename(source, target)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'EEXIST' && code !== 'EPERM') throw error
    await fs.rm(target, { force: true })
    await fs.rename(source, target)
  }
}

function datasetLabel(entry: PlanaManifestEntry) {
  return `${entry.region} ${entry.raidType} ${entry.season} (${entry.raidDate})`
}

function datasetIdentity(dataset: { region: string; raidType: string; raidDate: string }) {
  return `${dataset.region}:${dataset.raidType}:${dataset.raidDate}`
}

function errorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Plana request timed out.'
  }
  return error instanceof Error ? error.message : 'Unknown Plana import error.'
}

async function updateState(data: Partial<{
  status: string
  stage: string
  total: number
  processed: number
  downloaded: number
  skipped: number
  failed: number
  currentDataset: string | null
  message: string | null
  error: string | null
  manifestSchemaVersion: number | null
  completedAt: Date | null
  lastSuccessfulSyncAt: Date | null
}>) {
  await prisma.planaImportState.update({
    where: { id: PLANA_IMPORT_ID },
    data,
  })
}
