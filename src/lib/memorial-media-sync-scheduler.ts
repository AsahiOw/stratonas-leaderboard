import { getMemorialMediaSyncState, startMemorialMediaSync } from '@/lib/memorial-media-sync'

const TARGET_UTC_DAY = 3
const TARGET_UTC_HOUR = 17
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_TIMEOUT_MS = 2_147_483_647

const globalForScheduler = globalThis as unknown as {
  memorialMediaSyncSchedulerStarted?: boolean
  memorialMediaSyncSchedulerTimer?: NodeJS.Timeout
}

export function startMemorialMediaSyncScheduler() {
  if (globalForScheduler.memorialMediaSyncSchedulerStarted) return
  globalForScheduler.memorialMediaSyncSchedulerStarted = true

  const run = async () => {
    try {
      await startDueScheduledSync()
    } catch (error) {
      console.error('Memorial media sync scheduler failed:', error)
    } finally {
      scheduleNextRun()
    }
  }

  const timer = setTimeout(run, 10_000)
  timer.unref?.()
  globalForScheduler.memorialMediaSyncSchedulerTimer = timer
}

async function startDueScheduledSync() {
  const now = new Date()
  const scheduledAt = latestScheduledAt(now)
  const state = await getMemorialMediaSyncState()
  const lastScheduledRunAt = state.lastScheduledRunAt ? new Date(state.lastScheduledRunAt) : null

  if (lastScheduledRunAt && lastScheduledRunAt >= scheduledAt) return

  await startMemorialMediaSync({
    trigger: 'scheduled',
    scheduledAt,
  })
}

function scheduleNextRun() {
  const now = new Date()
  const next = nextScheduledAt(now)
  const delay = Math.max(60_000, Math.min(MAX_TIMEOUT_MS, next.getTime() - now.getTime()))
  const timer = setTimeout(async () => {
    await startDueScheduledSync()
    scheduleNextRun()
  }, delay)
  timer.unref?.()
  globalForScheduler.memorialMediaSyncSchedulerTimer = timer
}

function latestScheduledAt(now: Date) {
  const candidate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    TARGET_UTC_HOUR,
    0,
    0,
    0
  ))
  const dayOffset = (candidate.getUTCDay() - TARGET_UTC_DAY + 7) % 7
  candidate.setUTCDate(candidate.getUTCDate() - dayOffset)
  if (candidate > now) candidate.setUTCDate(candidate.getUTCDate() - 7)
  return candidate
}

function nextScheduledAt(now: Date) {
  const latest = latestScheduledAt(now)
  return new Date(latest.getTime() + WEEK_MS)
}
