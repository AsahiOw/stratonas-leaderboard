import { spawn } from 'child_process'
import { statSync } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { invalidatePublicData, PUBLIC_CACHE_TAGS } from '@/lib/cache'
import { prisma } from '@/lib/prisma'

export const RADIO_SYNC_ID = 'bluearchive-global-radio'
export const RADIO_TITLE_MARKER = '| OST [1 Hour Loop]'

const CHANNEL_URL = 'https://www.youtube.com/@bluearchive_Global/videos'
const DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'Development_data')
export const RADIO_AUDIO_DIR = path.join(DATA_DIR, 'radio', 'audio')
export const RADIO_THUMBNAIL_DIR = path.join(DATA_DIR, 'radio', 'thumbnails')
const ARCHIVE_PATH = path.join(DATA_DIR, 'radio', 'bluearchive-global-archive.txt')
const COOKIES_PATH = path.join(DATA_DIR, 'cookies.txt')
const STALE_SYNC_MS = 90_000
const HEARTBEAT_MS = 10_000

type Listing = { id: string; title: string; uploadDate?: string }

let activeProcess: ReturnType<typeof spawn> | null = null

export function radioDisplayTitle(title: string) {
  return title
    .replace(/^\s*\[Blue Archive\]\s*/i, '')
    .replace(RADIO_TITLE_MARKER, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function defaultRadioSyncState() {
  return {
    id: RADIO_SYNC_ID, status: 'idle', stage: 'idle', total: 0, processed: 0,
    discovered: 0, matched: 0, newTracks: 0, downloaded: 0, thumbnails: 0,
    skipped: 0, failed: 0, currentItem: null as string | null,
    message: null as string | null, error: null as string | null,
    startedAt: null as Date | null, completedAt: null as Date | null,
  }
}

export async function getRadioSyncState() {
  await recoverInterruptedRadioSync()
  return await prisma.radioSyncState.findUnique({ where: { id: RADIO_SYNC_ID } }) || defaultRadioSyncState()
}

export async function recoverInterruptedRadioSync(now = new Date()) {
  const staleBefore = new Date(now.getTime() - STALE_SYNC_MS)
  await prisma.radioSyncState.updateMany({
    where: { id: RADIO_SYNC_ID, status: 'running', updatedAt: { lt: staleBefore } },
    data: {
      status: 'failed', stage: 'Interrupted', currentItem: null,
      error: 'The Radio sync stopped unexpectedly. You can safely run it again.', completedAt: now,
    },
  })
}

export async function startRadioSync() {
  await ensureDirectories()
  await prisma.radioSyncState.upsert({
    where: { id: RADIO_SYNC_ID }, update: {},
    create: { id: RADIO_SYNC_ID, status: 'idle', stage: 'idle' },
  })

  await recoverInterruptedRadioSync()

  const lock = await prisma.radioSyncState.updateMany({
    where: { id: RADIO_SYNC_ID, NOT: { status: 'running' } },
    data: {
      status: 'running', stage: 'Checking YouTube', total: 0, processed: 0,
      discovered: 0, matched: 0, newTracks: 0, downloaded: 0, thumbnails: 0,
      skipped: 0, failed: 0, currentItem: null, message: null, error: null,
      startedAt: new Date(), completedAt: null,
    },
  })
  if (!lock.count) return false
  void runRadioSync()
  return true
}

async function runRadioSync() {
  let downloaded = 0
  let thumbnails = 0
  let skipped = 0
  let failed = 0
  try {
    const ytDlp = await resolveYtDlp()
    const all = await listChannel(ytDlp)
    const matching = all.filter((video) => video.title.includes(RADIO_TITLE_MARKER))

    for (const video of matching) {
      await prisma.radioTrack.upsert({
        where: { youtubeId: video.id },
        create: {
          youtubeId: video.id, title: video.title, displayTitle: radioDisplayTitle(video.title),
          youtubeUrl: youtubeUrl(video.id), publishedAt: parseUploadDate(video.uploadDate),
        },
        update: {
          title: video.title, displayTitle: radioDisplayTitle(video.title), youtubeUrl: youtubeUrl(video.id),
          ...(video.uploadDate ? { publishedAt: parseUploadDate(video.uploadDate) } : {}),
        },
      })
    }

    const existing = await prisma.radioTrack.findMany({ where: { youtubeId: { in: matching.map((item) => item.id) } } })
    const readyIds = new Set<string>()
    for (const track of existing) {
      if (track.audioFileName && track.thumbnailFileName
        && await isFile(path.join(RADIO_AUDIO_DIR, track.audioFileName))
        && await isFile(path.join(RADIO_THUMBNAIL_DIR, track.thumbnailFileName))) readyIds.add(track.youtubeId)
    }
    const pending = matching.filter((video) => !readyIds.has(video.id))

    await updateState({
      discovered: all.length, matched: matching.length, newTracks: pending.length,
      total: pending.length, stage: pending.length ? 'Downloading Radio tracks' : 'Complete',
      message: pending.length ? `Found ${pending.length} track${pending.length === 1 ? '' : 's'} to download.` : 'Radio library is up to date.',
    })

    for (let index = 0; index < pending.length; index += 1) {
      const video = pending[index]
      await updateState({ currentItem: radioDisplayTitle(video.title), processed: index })
      try {
        const result = await downloadTrack(ytDlp, video)
        downloaded += result.audio ? 1 : 0
        thumbnails += result.thumbnail ? 1 : 0
        skipped += result.skipped ? 1 : 0
        await appendArchive(video.id)
      } catch (error) {
        failed += 1
        await prisma.radioTrack.update({
          where: { youtubeId: video.id },
          data: { status: 'failed', error: error instanceof Error ? error.message : 'Download failed.' },
        })
      }
      await updateState({ processed: index + 1, downloaded, thumbnails, skipped, failed })
    }

    await updateState({
      status: 'completed', stage: 'Complete', currentItem: null, completedAt: new Date(),
      message: `Radio sync complete: ${downloaded} audio, ${thumbnails} thumbnail${thumbnails === 1 ? '' : 's'}, ${failed} failed.`,
    })
    invalidatePublicData([PUBLIC_CACHE_TAGS.radio])
  } catch (error) {
    await updateState({
      status: 'failed', stage: 'Failed', currentItem: null, completedAt: new Date(),
      error: error instanceof Error ? error.message : 'Radio sync failed.',
    })
  }
}

async function downloadTrack(ytDlp: string, video: Listing) {
  const audioName = `${video.id}.m4a`
  const thumbnailName = `${video.id}.webp`
  const audioPath = path.join(RADIO_AUDIO_DIR, audioName)
  const thumbnailPath = path.join(RADIO_THUMBNAIL_DIR, thumbnailName)
  const hadAudio = await isFile(audioPath)
  const hadThumbnail = await isFile(thumbnailPath)

  await prisma.radioTrack.update({ where: { youtubeId: video.id }, data: { status: 'downloading', error: null } })

  if (!hadAudio) {
    await runCommand(ytDlp, [
      ...cookieArgs(), '--no-warnings', '--no-playlist', '-x', '--audio-format', 'm4a',
      '--audio-quality', '128K', '-o', path.join(RADIO_AUDIO_DIR, `${video.id}.%(ext)s`), youtubeUrl(video.id),
    ])
  }
  if (!hadThumbnail) {
    await runCommand(ytDlp, [
      ...cookieArgs(), '--no-warnings', '--no-playlist', '--skip-download', '--write-thumbnail',
      '--convert-thumbnails', 'webp', '-o', path.join(RADIO_THUMBNAIL_DIR, `${video.id}.%(ext)s`), youtubeUrl(video.id),
    ])
  }
  if (!await isFile(audioPath) || !await isFile(thumbnailPath)) throw new Error('yt-dlp did not create the expected audio and thumbnail files.')

  const duration = await probeDuration(audioPath)
  await prisma.radioTrack.update({
    where: { youtubeId: video.id },
    data: {
      audioFileName: audioName, thumbnailFileName: thumbnailName, durationSeconds: duration,
      status: 'ready', error: null, downloadedAt: new Date(),
    },
  })
  return { audio: !hadAudio, thumbnail: !hadThumbnail, skipped: hadAudio && hadThumbnail }
}

async function listChannel(ytDlp: string) {
  const output = await runCommand(ytDlp, [
    ...cookieArgs(), '--no-warnings', '--flat-playlist', '--print', '%(id)s\t%(title)s\t%(upload_date)s', CHANNEL_URL,
  ])
  return output.split(/\r?\n/).map((line): Listing | null => {
    const [id, title, uploadDate] = line.trim().split('\t')
    if (!id || !title || id === 'NA') return null
    return { id, title, uploadDate: uploadDate && uploadDate !== 'NA' ? uploadDate : undefined }
  }).filter((item): item is Listing => Boolean(item))
}

async function probeDuration(filePath: string) {
  const output = await runCommand('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath])
  const duration = Number(output.trim())
  return Number.isFinite(duration) ? Math.round(duration) : null
}

async function resolveYtDlp() {
  const bundled = path.join(DATA_DIR, 'yt-dlp.exe')
  return process.platform === 'win32' && await isFile(bundled) ? bundled : 'yt-dlp'
}

function cookieArgs() {
  const browser = process.env.MEDIA_YTDLP_COOKIES_FROM_BROWSER?.trim()
  if (browser) return ['--cookies-from-browser', browser]
  try { if (statSync(COOKIES_PATH).isFile()) return ['--cookies', COOKIES_PATH] } catch { /* optional */ }
  return []
}

async function runCommand(command: string, args: string[]) {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true })
    activeProcess = child
    let stdout = ''
    let stderr = ''
    const heartbeat = setInterval(() => {
      void updateState({ updatedAt: new Date() }).catch(() => undefined)
    }, HEARTBEAT_MS)
    heartbeat.unref?.()
    const finish = () => clearInterval(heartbeat)
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    child.on('error', (error) => {
      finish()
      if (activeProcess === child) activeProcess = null
      reject(new Error(`${command} could not start: ${error.message}`))
    })
    child.on('close', (code) => {
      finish()
      if (activeProcess === child) activeProcess = null
      code === 0 ? resolve(stdout) : reject(new Error(`${command} failed with exit code ${code}.${stderr ? ` ${stderr.trim()}` : ''}`))
    })
  })
}

async function updateState(data: Record<string, unknown>) {
  await prisma.radioSyncState.update({ where: { id: RADIO_SYNC_ID }, data })
}

async function ensureDirectories() {
  await fs.mkdir(RADIO_AUDIO_DIR, { recursive: true })
  await fs.mkdir(RADIO_THUMBNAIL_DIR, { recursive: true })
}

async function isFile(filePath: string) {
  try { return (await fs.stat(filePath)).isFile() } catch { return false }
}

async function appendArchive(id: string) {
  let archive = ''
  try { archive = await fs.readFile(ARCHIVE_PATH, 'utf8') } catch { /* new archive */ }
  if (!archive.split(/\r?\n/).some((line) => line.trim().endsWith(id))) await fs.appendFile(ARCHIVE_PATH, `youtube ${id}\n`)
}

function youtubeUrl(id: string) { return `https://www.youtube.com/watch?v=${id}` }

function parseUploadDate(value?: string) {
  if (!value || !/^\d{8}$/.test(value)) return null
  return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`)
}
