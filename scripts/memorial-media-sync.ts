import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import {
  cancelActiveMemorialMediaSync,
  getMemorialMediaSyncState,
  runMemorialMediaSyncNow,
} from '../src/lib/memorial-media-sync'

const processExisting = process.argv.includes('--process-existing')
const POLL_MS = 1000
const HEARTBEAT_MS = 10_000
let stopping = false

async function main() {
  const startedAt = Date.now()
  process.once('SIGINT', () => {
    stopping = true
    console.log('\nStopping memorial media sync...')
    void cancelActiveMemorialMediaSync('Stopped by Ctrl+C from the media CLI.')
      .finally(async () => {
        await prisma.$disconnect()
        process.exit(130)
      })
  })

  const job = runMemorialMediaSyncNow({
    mode: processExisting ? 'process-existing' : 'sync',
    trigger: 'cli',
  })

  let started = false
  let finished = false
  job
    .then((value) => {
      started = value
    })
    .finally(() => {
      finished = true
    })

  await sleep(50)
  if (finished && !started) {
    const state = await getMemorialMediaSyncState()
    console.error(`Memorial media sync is already running: ${state.stage}`)
    process.exitCode = 1
    return
  }

  let lastLine = ''
  let lastPrintedAt = 0
  for (;;) {
    const state = await getMemorialMediaSyncState()
    const line = !started && !finished && state.status !== 'running'
      ? '[Starting] | waiting for media sync lock'
      : formatState(state, startedAt)

    if (line !== lastLine || Date.now() - lastPrintedAt >= HEARTBEAT_MS) {
      console.log(line)
      lastLine = line
      lastPrintedAt = Date.now()
    }

    if (finished) {
      const completed = await job
      if (!completed) {
        console.error(`Memorial media sync is already running: ${state.stage}`)
        process.exitCode = 1
        return
      }

      const finalState = await getMemorialMediaSyncState()
      if (finalState.status === 'failed') {
        console.error(finalState.error || 'Memorial media sync failed.')
        process.exitCode = 1
        return
      }

      console.log(finalState.message || 'Memorial media sync completed.')
      return
    }

    await sleep(POLL_MS)
  }
}

function formatState(state: Awaited<ReturnType<typeof getMemorialMediaSyncState>>, startedAt: number) {
  const progress = state.total > 0
    ? `${state.processed.toLocaleString()} / ${state.total.toLocaleString()}`
    : 'starting'
  const item = state.currentItem ? ` - ${state.currentItem}` : ''
  const message = state.message ? ` | ${state.message}` : ''
  const elapsed = formatElapsed(Date.now() - startedAt)

  return [
    `[${state.stage || state.status}]`,
    `elapsed ${elapsed}`,
    progress,
    `found ${state.newVideos.toLocaleString()}`,
    `downloaded ${state.downloaded.toLocaleString()}`,
    `optimized ${state.optimized.toLocaleString()}`,
    `posters ${state.posters.toLocaleString()}`,
    `skipped ${state.skipped.toLocaleString()}${item}${message}`,
  ].join(' | ')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

main()
  .catch((error) => {
    if (!stopping) console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
