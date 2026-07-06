import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { statSync } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { runStudentImportSync } from '@/lib/student-import'

export const MEMORIAL_MEDIA_SYNC_ID = 'jaymie-memorial-media'

const CHANNEL_URL = 'https://www.youtube.com/@JaymieArclight/videos'
const DEVELOPMENT_DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'Development_data')
const SOURCE_DIR = path.join(DEVELOPMENT_DATA_DIR, 'lobbies')
const VIDEO_OUT_DIR = path.join(DEVELOPMENT_DATA_DIR, 'lobbies-optimized')
const POSTER_OUT_DIR = path.join(DEVELOPMENT_DATA_DIR, 'lobby-posters')
const ARCHIVE_PATH = path.join(DEVELOPMENT_DATA_DIR, 'jaymie-yt-dlp-archive.txt')
const COOKIES_PATH = path.join(DEVELOPMENT_DATA_DIR, 'cookies.txt')
const HEIGHT = 720
const FPS = 24
const CRF = 30
const PRESET = 'slow'
const FFMPEG_THREADS = process.env.MEDIA_FFMPEG_THREADS?.trim() || '2'

type MediaSyncMode = 'sync' | 'process-existing'
type MediaSyncTrigger = 'manual' | 'scheduled' | 'cli'

type StartOptions = {
  mode?: MediaSyncMode
  trigger?: MediaSyncTrigger
  scheduledAt?: Date
}

type VideoListing = {
  id: string
  title: string
}

type DownloadedVideo = {
  filePath: string
  youtubeId?: string | null
  title?: string | null
}

type CommandResult = {
  stdout: string
  stderr: string
}

type FfmpegProgress = {
  label: string
  inputPath: string
}

let activeChild: ChildProcessWithoutNullStreams | null = null

export function defaultMemorialMediaSyncState() {
  return {
    id: MEMORIAL_MEDIA_SYNC_ID,
    status: 'idle',
    stage: 'idle',
    total: 0,
    processed: 0,
    discovered: 0,
    newVideos: 0,
    downloaded: 0,
    optimized: 0,
    posters: 0,
    skipped: 0,
    currentItem: null as string | null,
    message: null as string | null,
    error: null as string | null,
    lastScheduledRunAt: null as Date | null,
    startedAt: null as Date | null,
    completedAt: null as Date | null,
  }
}

export async function getMemorialMediaSyncState() {
  return (await prisma.memorialMediaSyncState.findUnique({
    where: { id: MEMORIAL_MEDIA_SYNC_ID },
  })) || defaultMemorialMediaSyncState()
}

async function ensureMemorialMediaSyncState() {
  await prisma.memorialMediaSyncState.upsert({
    where: { id: MEMORIAL_MEDIA_SYNC_ID },
    update: {},
    create: {
      id: MEMORIAL_MEDIA_SYNC_ID,
      status: 'idle',
      stage: 'idle',
      updatedAt: new Date(),
    },
  })
}

export async function startMemorialMediaSync(options: StartOptions = {}) {
  await ensureMemorialMediaSyncState()

  const lock = await prisma.memorialMediaSyncState.updateMany({
    where: { id: MEMORIAL_MEDIA_SYNC_ID, NOT: { status: 'running' } },
    data: initialRunningState(options),
  })

  if (lock.count === 0) return false

  void runMemorialMediaSync(options)
  return true
}

export async function runMemorialMediaSyncNow(options: StartOptions = {}) {
  await ensureMemorialMediaSyncState()

  const lock = await prisma.memorialMediaSyncState.updateMany({
    where: { id: MEMORIAL_MEDIA_SYNC_ID, NOT: { status: 'running' } },
    data: initialRunningState({ ...options, trigger: options.trigger || 'cli' }),
  })

  if (lock.count === 0) return false

  await runMemorialMediaSync({ ...options, trigger: options.trigger || 'cli' })
  return true
}

export async function cancelActiveMemorialMediaSync(reason = 'Memorial media sync was stopped.') {
  if (activeChild && !activeChild.killed) {
    activeChild.kill()
  }

  await prisma.memorialMediaSyncState.updateMany({
    where: { id: MEMORIAL_MEDIA_SYNC_ID, status: 'running' },
    data: {
      status: 'failed',
      stage: 'Stopped',
      currentItem: null,
      error: reason,
      completedAt: new Date(),
    },
  })
}

export async function backfillMemorialVideoAssets() {
  await ensureMediaDirectories()

  const entries = await fs.readdir(SOURCE_DIR, { withFileTypes: true })
  let count = 0

  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.mp4') continue
    await upsertLocalVideo(path.join(SOURCE_DIR, entry.name))
    count += 1
  }

  return count
}

function initialRunningState(options: StartOptions) {
  return {
    status: 'running',
    stage: options.mode === 'process-existing' ? 'Scanning local videos' : 'Checking YouTube',
    total: 0,
    processed: 0,
    discovered: 0,
    newVideos: 0,
    downloaded: 0,
    optimized: 0,
    posters: 0,
    skipped: 0,
    currentItem: null,
    message: null,
    error: null,
    startedAt: new Date(),
    completedAt: null,
    ...(options.scheduledAt ? { lastScheduledRunAt: options.scheduledAt } : {}),
  }
}

async function runMemorialMediaSync(options: StartOptions) {
  let optimized = 0
  let posters = 0
  let skipped = 0

  try {
    await ensureMediaDirectories()

    const mode = options.mode || 'sync'
    const sourceVideos = mode === 'process-existing'
      ? await findExistingVideosNeedingWork()
      : await findSyncVideosNeedingWork()

    if (sourceVideos.length === 0) {
      const state = await getMemorialMediaSyncState()
      const message = mode === 'process-existing'
        ? 'No local memorial videos need processing.'
        : state.newVideos > 0
          ? `Found ${state.newVideos} unarchived YouTube video${state.newVideos === 1 ? '' : 's'}, but no local videos need processing.`
          : 'No new YouTube videos or local missing outputs were found.'
      await completeState({ message })
      return
    }

    await updateState({
      stage: 'Processing media',
      total: sourceVideos.length,
      processed: 0,
      message: `Processing ${sourceVideos.length} memorial video${sourceVideos.length === 1 ? '' : 's'}.`,
    })

    for (let index = 0; index < sourceVideos.length; index += 1) {
      const result = await processVideo(sourceVideos[index])
      optimized += result.optimized
      posters += result.posters
      skipped += result.skipped

      await updateState({
        processed: index + 1,
        optimized,
        posters,
        skipped,
        currentItem: path.basename(sourceVideos[index]),
      })
    }

    if (optimized > 0 || posters > 0) {
      await updateState({
        stage: 'Refreshing student links',
        currentItem: null,
        message: 'Refreshing student memorial links.',
      })
      const studentImportStarted = await runStudentImportSync()
      if (!studentImportStarted) {
        await updateState({
          message: 'Media processed. Student import was already running, so memorial links will refresh when it completes.',
        })
      }
    }

    const finalDownloaded = await downloadedCount()
    await completeState({
      message: `Media sync completed. Downloaded ${finalDownloaded} new video${finalDownloaded === 1 ? '' : 's'}, optimized ${optimized}, generated ${posters} poster${posters === 1 ? '' : 's'}.`,
    })
  } catch (error) {
    await prisma.memorialMediaSyncState.update({
      where: { id: MEMORIAL_MEDIA_SYNC_ID },
      data: {
        status: 'failed',
        stage: 'Failed',
        error: error instanceof Error ? error.message : 'Memorial media sync failed.',
        completedAt: new Date(),
      },
    })
  }
}

async function downloadedCount() {
  const state = await getMemorialMediaSyncState()
  return state.downloaded
}

async function findSyncVideosNeedingWork() {
  await downloadNewVideos()

  await updateState({
    stage: 'Scanning local videos',
    currentItem: null,
    message: 'Checking raw lobby videos for missing optimized videos and posters.',
  })

  return findExistingVideosNeedingWork()
}

async function downloadNewVideos() {
  const ytDlp = await resolveYtDlp()
  await updateState({ stage: 'Checking YouTube', message: 'Reading Jaymie Arclight channel videos.' })

  const videos = await listChannelVideos(ytDlp)
  await upsertDiscoveredVideos(videos)
  const archivedIds = await readArchiveIds()
  const newVideos = videos.filter((video) => !archivedIds.has(video.id))

  await updateState({
    discovered: videos.length,
    newVideos: newVideos.length,
    total: newVideos.length,
    message: newVideos.length > 0
      ? `Found ${newVideos.length} new YouTube video${newVideos.length === 1 ? '' : 's'}.`
      : 'No new YouTube videos were found.',
  })

  if (newVideos.length === 0) return []

  await updateState({
    stage: 'Downloading',
    currentItem: newVideos[0]?.title || null,
    message: 'Downloading new memorial lobby videos.',
  })

  const downloadedFiles = await runYtDlpDownload(ytDlp)
  await updateState({
    downloaded: downloadedFiles.length,
    total: downloadedFiles.length,
    message: downloadedFiles.length > 0
      ? `Downloaded ${downloadedFiles.length} new video${downloadedFiles.length === 1 ? '' : 's'}.`
      : 'No new video files were downloaded.',
  })

  return downloadedFiles
}

async function listChannelVideos(ytDlp: string) {
  const result = await runCommand(ytDlp, [
    ...commonYtDlpArgs(),
    '--flat-playlist',
    '--print',
    '%(id)s\t%(title)s',
    CHANNEL_URL,
  ])

  return result.stdout
    .split(/\r?\n/)
    .map((line): VideoListing | null => {
      const trimmed = line.trim()
      if (!trimmed) return null
      const [id, ...titleParts] = trimmed.split('\t')
      if (!id || id === 'NA') return null
      return { id, title: titleParts.join('\t') || id }
    })
    .filter((video): video is VideoListing => Boolean(video))
}

async function runYtDlpDownload(ytDlp: string) {
  const downloaded = new Map<string, DownloadedVideo>()
  const result = await runCommand(ytDlp, [
    ...commonYtDlpArgs(),
    '--download-archive',
    ARCHIVE_PATH,
    '--ignore-errors',
    '--ignore-no-formats-error',
    '--no-abort-on-error',
    '--no-overwrites',
    '--merge-output-format',
    'mp4',
    '--remux-video',
    'mp4',
    '-o',
    path.join(SOURCE_DIR, '%(title)s.%(ext)s'),
    '--print',
    'after_move:SYNC_FILE:%(id)s\t%(title)s\t%(filepath)s',
    CHANNEL_URL,
  ], {
    onLine: async (line) => {
      const synced = parseSyncedFileLine(line)
      if (synced) {
        const resolvedPath = path.resolve(synced.filePath)
        downloaded.set(resolvedPath, { ...synced, filePath: resolvedPath })
        await upsertDownloadedVideo({ ...synced, filePath: resolvedPath })
        await updateState({
          downloaded: downloaded.size,
          processed: downloaded.size,
          currentItem: path.basename(synced.filePath),
        })
        return
      }

      const destination = parseYtDlpDestination(line)
      if (destination) {
        await updateState({ currentItem: path.basename(destination) })
      }
    },
  })

  for (const line of result.stdout.split(/\r?\n/)) {
    const synced = parseSyncedFileLine(line)
    if (synced) downloaded.set(path.resolve(synced.filePath), synced)
  }

  const files = []
  for (const file of downloaded.keys()) {
    if (path.extname(file).toLowerCase() !== '.mp4') continue
    if (await isFile(file)) files.push(file)
  }
  return files.sort()
}

function commonYtDlpArgs() {
  return [
    ...cookieArgs(),
    '--no-warnings',
  ]
}

async function readArchiveIds() {
  const ids = new Set<string>()
  try {
    const text = await fs.readFile(ARCHIVE_PATH, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/)
      const id = parts[parts.length - 1]
      if (id) ids.add(id)
    }
  } catch {
    return ids
  }
  return ids
}

async function findExistingVideosNeedingWork() {
  const entries = await fs.readdir(SOURCE_DIR, { withFileTypes: true })
  const candidates: string[] = []

  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.mp4') continue
    const source = path.join(SOURCE_DIR, entry.name)
    const optimized = path.join(VIDEO_OUT_DIR, entry.name)
    const poster = path.join(POSTER_OUT_DIR, `${path.parse(entry.name).name}.jpg`)
    await upsertLocalVideo(source)
    if (!await isFile(optimized) || !await isFile(poster)) candidates.push(source)
  }

  return candidates.sort()
}

async function processVideo(sourcePath: string) {
  const name = path.basename(sourcePath)
  const baseName = path.parse(name).name
  const optimizedPath = path.join(VIDEO_OUT_DIR, name)
  const posterPath = path.join(POSTER_OUT_DIR, `${baseName}.jpg`)
  let optimized = 0
  let posters = 0
  let skipped = 0

  await updateState({ stage: 'Optimizing video', currentItem: name })

  if (await isFile(optimizedPath)) {
    skipped += 1
    await upsertOptimizedVideo(sourcePath)
  } else {
    const tempVideo = `${optimizedPath}.tmp.mp4`
    await removeIfExists(tempVideo)
    await runFfmpeg([
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', sourcePath,
      '-vf', `scale=-2:${HEIGHT},fps=${FPS}`,
      '-c:v', 'libx264', '-preset', PRESET, '-crf', String(CRF),
      '-threads', FFMPEG_THREADS,
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
      tempVideo,
    ], { label: 'Optimizing', inputPath: sourcePath })
    await fs.rename(tempVideo, optimizedPath)
    optimized += 1
    await upsertOptimizedVideo(sourcePath)
  }

  await updateState({ stage: 'Generating poster', currentItem: name })

  if (await isFile(posterPath)) {
    skipped += 1
    await upsertPosterVideo(sourcePath)
  } else {
    const tempPoster = `${posterPath}.tmp.jpg`
    await removeIfExists(tempPoster)
    await runFfmpeg([
      '-hide_banner', '-loglevel', 'error', '-y',
      '-sseof', '-0.08', '-i', optimizedPath,
      '-frames:v', '1', '-vf', `scale=-2:${HEIGHT}`,
      tempPoster,
    ], { label: 'Generating poster', inputPath: optimizedPath })
    await fs.rename(tempPoster, posterPath)
    posters += 1
    await upsertPosterVideo(sourcePath)
  }

  return { optimized, posters, skipped }
}

async function runFfmpeg(args: string[], progress: FfmpegProgress) {
  const durationSeconds = await getVideoDurationSeconds(progress.inputPath)
  await runCommand('ffmpeg', [
    '-progress', 'pipe:1',
    ...args,
  ], {
    onLine: async (line) => {
      const next = parseFfmpegProgress(line, durationSeconds, progress.label)
      if (next) await updateState({ message: next })
    },
  })
}

async function getVideoDurationSeconds(filePath: string) {
  try {
    const result = await runCommand('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ])
    const duration = Number(result.stdout.trim())
    return Number.isFinite(duration) && duration > 0 ? duration : null
  } catch {
    return null
  }
}

function parseFfmpegProgress(line: string, durationSeconds: number | null, label: string) {
  if (!line.startsWith('out_time_ms=')) return null
  const outTimeMs = Number(line.slice('out_time_ms='.length))
  if (!Number.isFinite(outTimeMs) || outTimeMs < 0) return null

  const encodedSeconds = outTimeMs / 1_000_000
  if (!durationSeconds) return `${label}: ${formatDuration(encodedSeconds)} encoded.`

  const percent = Math.max(0, Math.min(100, Math.round((encodedSeconds / durationSeconds) * 100)))
  return `${label}: ${percent}% (${formatDuration(encodedSeconds)} / ${formatDuration(durationSeconds)})`
}

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(totalSeconds / 60)
  const remainder = totalSeconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

async function resolveYtDlp() {
  if (process.platform === 'win32') {
    const bundled = path.join(DEVELOPMENT_DATA_DIR, 'yt-dlp.exe')
    if (await isFile(bundled)) return bundled
  }
  return 'yt-dlp'
}

async function runCommand(
  command: string,
  args: string[],
  options: { onLine?: (line: string) => Promise<void> | void } = {}
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
    })
    activeChild = child
    let stdout = ''
    let stderr = ''
    let stdoutBuffer = ''
    let stderrBuffer = ''

    const emitLines = (chunk: Buffer, stream: 'stdout' | 'stderr') => {
      const text = chunk.toString()
      if (stream === 'stdout') stdout += text
      else stderr += text

      const normalized = text.replace(/\r/g, '\n')
      let buffer = stream === 'stdout' ? stdoutBuffer : stderrBuffer
      buffer += normalized
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      if (stream === 'stdout') stdoutBuffer = buffer
      else stderrBuffer = buffer

      for (const line of lines) {
        Promise.resolve(options.onLine?.(line)).catch(() => null)
      }
    }

    child.stdout.on('data', (chunk: Buffer) => emitLines(chunk, 'stdout'))
    child.stderr.on('data', (chunk: Buffer) => emitLines(chunk, 'stderr'))
    child.on('error', (error) => {
      if (activeChild === child) activeChild = null
      reject(new Error(`${command} could not be started: ${error.message}`))
    })
    child.on('close', (code) => {
      if (activeChild === child) activeChild = null
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(new Error(`${command} failed with exit code ${code}.${stderr ? ` ${stderr.trim()}` : ''}`))
    })
  })
}

function cookieArgs() {
  const cookiesFromBrowser = process.env.MEDIA_YTDLP_COOKIES_FROM_BROWSER?.trim()
  if (cookiesFromBrowser) return ['--cookies-from-browser', cookiesFromBrowser]

  return fsSyncFileExists(COOKIES_PATH) ? ['--cookies', COOKIES_PATH] : []
}

function fsSyncFileExists(filePath: string) {
  try {
    return statSync(filePath).isFile()
  } catch {
    return false
  }
}

function parseSyncedFileLine(line: string): DownloadedVideo | null {
  const marker = 'SYNC_FILE:'
  const index = line.indexOf(marker)
  if (index === -1) return null
  const value = line.slice(index + marker.length).trim()
  const [youtubeId, title, ...fileParts] = value.split('\t')
  const filePath = fileParts.join('\t')
  if (!filePath) return { filePath: value }
  return {
    youtubeId: youtubeId && youtubeId !== 'NA' ? youtubeId : null,
    title: title && title !== 'NA' ? title : null,
    filePath,
  }
}

function parseYtDlpDestination(line: string) {
  const match = line.match(/\[download\]\s+Destination:\s+(.+)$/)
  return match ? match[1].trim() : null
}

async function ensureMediaDirectories() {
  await fs.mkdir(SOURCE_DIR, { recursive: true })
  await fs.mkdir(VIDEO_OUT_DIR, { recursive: true })
  await fs.mkdir(POSTER_OUT_DIR, { recursive: true })
}

function videoUrl(fileName: string) {
  return `/api/memorial-video?file=${encodeURIComponent(fileName)}`
}

function posterUrl(fileName: string) {
  return `/api/memorial-poster?file=${encodeURIComponent(fileName)}&v=final-frame`
}

function youtubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`
}

function titleFromFileName(fileName: string) {
  return path.parse(fileName).name
}

async function upsertDiscoveredVideos(videos: VideoListing[]) {
  for (const video of videos) {
    await prisma.memorialVideoAsset.upsert({
      where: { youtubeId: video.id },
      update: {
        title: video.title,
        youtubeUrl: youtubeUrl(video.id),
        error: null,
      },
      create: {
        youtubeId: video.id,
        title: video.title,
        youtubeUrl: youtubeUrl(video.id),
        status: 'discovered',
      },
    })
  }
}

async function upsertDownloadedVideo(video: DownloadedVideo) {
  const fileName = path.basename(video.filePath)
  const title = video.title || titleFromFileName(fileName)
  const data = {
    title,
    fileName,
    videoUrl: videoUrl(fileName),
    status: 'downloaded',
    downloadedAt: new Date(),
    error: null,
    ...(video.youtubeId ? { youtubeUrl: youtubeUrl(video.youtubeId) } : {}),
  }

  if (video.youtubeId) {
    await prisma.memorialVideoAsset.upsert({
      where: { youtubeId: video.youtubeId },
      update: data,
      create: {
        youtubeId: video.youtubeId,
        ...data,
      },
    })
    return
  }

  await upsertVideoAssetByFileOrTitle(fileName, title, data)
}

async function upsertLocalVideo(sourcePath: string) {
  const fileName = path.basename(sourcePath)
  const title = titleFromFileName(fileName)
  const hasOptimized = await isFile(path.join(VIDEO_OUT_DIR, fileName))
  const hasPoster = await isFile(path.join(POSTER_OUT_DIR, `${path.parse(fileName).name}.jpg`))
  const now = new Date()
  const data = {
    title,
    fileName,
    videoUrl: hasOptimized ? videoUrl(fileName) : null,
    posterUrl: hasPoster ? posterUrl(fileName) : null,
    status: hasOptimized && hasPoster ? 'ready' : 'source',
    downloadedAt: now,
    optimizedAt: hasOptimized ? now : null,
    posterGeneratedAt: hasPoster ? now : null,
    error: null,
  }

  await upsertVideoAssetByFileOrTitle(fileName, title, data)
}

async function upsertOptimizedVideo(sourcePath: string) {
  const fileName = path.basename(sourcePath)
  const title = titleFromFileName(fileName)
  await upsertVideoAssetByFileOrTitle(fileName, title, {
    title,
    fileName,
    videoUrl: videoUrl(fileName),
    status: 'optimized',
    optimizedAt: new Date(),
    error: null,
  })
}

async function upsertPosterVideo(sourcePath: string) {
  const fileName = path.basename(sourcePath)
  const title = titleFromFileName(fileName)
  await upsertVideoAssetByFileOrTitle(fileName, title, {
    title,
    fileName,
    videoUrl: videoUrl(fileName),
    posterUrl: posterUrl(fileName),
    status: 'ready',
    posterGeneratedAt: new Date(),
    error: null,
  })
}

async function upsertVideoAssetByFileOrTitle(
  fileName: string,
  title: string,
  data: Parameters<typeof prisma.memorialVideoAsset.create>[0]['data']
) {
  const existingByFile = await prisma.memorialVideoAsset.findUnique({ where: { fileName } })
  if (existingByFile) {
    await prisma.memorialVideoAsset.update({
      where: { id: existingByFile.id },
      data,
    })
    return
  }

  const existingByTitle = await prisma.memorialVideoAsset.findFirst({
    where: { title, fileName: null },
    orderBy: { createdAt: 'asc' },
  })
  if (existingByTitle) {
    await prisma.memorialVideoAsset.update({
      where: { id: existingByTitle.id },
      data,
    })
    return
  }

  await prisma.memorialVideoAsset.create({ data })
}

async function isFile(filePath: string) {
  try {
    const stats = await fs.stat(filePath)
    return stats.isFile()
  } catch {
    return false
  }
}

async function removeIfExists(filePath: string) {
  try {
    await fs.unlink(filePath)
  } catch {
    return
  }
}

async function updateState(data: Partial<{
  status: string
  stage: string
  total: number
  processed: number
  discovered: number
  newVideos: number
  downloaded: number
  optimized: number
  posters: number
  skipped: number
  currentItem: string | null
  message: string | null
  error: string | null
  completedAt: Date | null
}>) {
  await prisma.memorialMediaSyncState.update({
    where: { id: MEMORIAL_MEDIA_SYNC_ID },
    data,
  })
}

async function completeState(data: { message: string }) {
  await updateState({
    status: 'completed',
    stage: 'Completed',
    currentItem: null,
    message: data.message,
    error: null,
    completedAt: new Date(),
  })
}
