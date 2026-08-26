import { randomUUID } from 'node:crypto'
import {
  isWithinMaintenanceWindow,
  MAINTENANCE_SCHEDULES,
  MAINTENANCE_WINDOW_MS,
  type MaintenanceJobId,
  type MaintenanceSchedule,
} from '@/lib/maintenance-schedule'
import { prisma } from '@/lib/prisma'
import { recordAdminActivity } from '@/lib/admin-activity'

const TICK_MS = 60_000
const LOCK_STALE_MS = 2 * 60_000
const HEARTBEAT_MS = 30_000
const LOCK_ID = 'global'

const JOB_ENV: Record<MaintenanceJobId, string> = {
  radio: 'RADIO_SYNC_SCHEDULER',
  students: 'STUDENT_IMPORT_SCHEDULER',
  bosses: 'BOSS_IMPORT_SCHEDULER',
  plana: 'PLANA_IMPORT_SCHEDULER',
  memorial: 'MEMORIAL_MEDIA_SYNC_SCHEDULER',
}

const globalForScheduler = globalThis as unknown as {
  maintenanceSchedulerStarted?: boolean
  maintenanceSchedulerTimer?: NodeJS.Timeout
  maintenanceSchedulerTickRunning?: boolean
  memorialMediaSyncSchedulerStarted?: boolean
  memorialMediaSyncSchedulerTimer?: NodeJS.Timeout
}

export function startMaintenanceScheduler() {
  if (globalForScheduler.maintenanceSchedulerStarted) return
  if (globalForScheduler.memorialMediaSyncSchedulerTimer) {
    clearTimeout(globalForScheduler.memorialMediaSyncSchedulerTimer)
    delete globalForScheduler.memorialMediaSyncSchedulerTimer
    delete globalForScheduler.memorialMediaSyncSchedulerStarted
  }
  globalForScheduler.maintenanceSchedulerStarted = true
  scheduleTick(1_000)
}

function scheduleTick(delay = nextMinuteDelay()) {
  const timer = setTimeout(async () => {
    if (!globalForScheduler.maintenanceSchedulerTickRunning) {
      globalForScheduler.maintenanceSchedulerTickRunning = true
      try {
        await runMaintenanceSchedulerTick()
      } catch (error) {
        console.error('Maintenance scheduler failed:', error)
      } finally {
        globalForScheduler.maintenanceSchedulerTickRunning = false
      }
    }
    scheduleTick()
  }, delay)
  timer.unref?.()
  globalForScheduler.maintenanceSchedulerTimer = timer
}

export async function runMaintenanceSchedulerTick(now = new Date()) {
  await recoverStaleRuns(now)
  await expirePendingRuns(now)

  for (const schedule of MAINTENANCE_SCHEDULES) {
    if (!isJobEnabled(schedule.id)) continue
    const window = isWithinMaintenanceWindow(schedule, now)
    if (!window.eligible) continue
    await attemptScheduledJob(schedule, window.scheduledAt)
  }
}

async function attemptScheduledJob(schedule: MaintenanceSchedule, scheduledAt: Date) {
  const run = await prisma.maintenanceJobRun.upsert({
    where: { jobId_scheduledAt: { jobId: schedule.id, scheduledAt } },
    update: {},
    create: { jobId: schedule.id, scheduledAt, status: 'pending' },
  })
  if (run.status !== 'pending') return

  const holder = await acquireMaintenanceLock(schedule.id)
  if (!holder) return
  if (await hasActiveImport()) {
    await releaseMaintenanceLock(holder)
    return
  }

  const claimed = await prisma.maintenanceJobRun.updateMany({
    where: { id: run.id, status: 'pending' },
    data: { status: 'running', startedAt: new Date(), message: `Running ${schedule.label}.`, error: null },
  })
  if (!claimed.count) {
    await releaseMaintenanceLock(holder)
    return
  }

  const heartbeat = setInterval(() => {
    void heartbeatMaintenanceRun(holder, run.id).catch(() => undefined)
  }, HEARTBEAT_MS)
  heartbeat.unref?.()

  try {
    const message = await executeJob(schedule.id, scheduledAt)
    if (message === false) {
      await prisma.maintenanceJobRun.update({
        where: { id: run.id },
        data: { status: 'pending', startedAt: null, message: `${schedule.label} is already running; retrying within its schedule window.` },
      })
      return
    }
    await prisma.maintenanceJobRun.update({
      where: { id: run.id },
      data: { status: 'completed', message, error: null, completedAt: new Date() },
    })
    await recordScheduledMaintenanceActivity(schedule, run.id, scheduledAt, 'success', message)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `${schedule.label} failed.`
    await prisma.maintenanceJobRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        error: errorMessage,
        completedAt: new Date(),
      },
    })
    await recordScheduledMaintenanceActivity(schedule, run.id, scheduledAt, 'failed', errorMessage)
  } finally {
    clearInterval(heartbeat)
    await releaseMaintenanceLock(holder)
  }
}

export async function recordScheduledMaintenanceActivity(
  schedule: MaintenanceSchedule,
  runId: string,
  scheduledAt: Date,
  status: 'success' | 'failed',
  message: string,
) {
  await recordAdminActivity({
    actorType: 'AUTOMATION',
    action: schedule.id === 'students' || schedule.id === 'bosses' ? 'IMPORT' : 'SYNC',
    entityType: schedule.label,
    entityId: runId,
    summary: `${schedule.label} scheduled job ${status === 'success' ? 'completed' : 'failed'}`,
    status,
    details: { jobId: schedule.id, runId, scheduledAt, message },
  }).catch((error) => console.error(`Could not record ${schedule.label} scheduler activity:`, error))
}

async function executeJob(jobId: MaintenanceJobId, scheduledAt: Date): Promise<string | false> {
  if (jobId === 'radio') {
    const { getRadioSyncState, runRadioSyncNow } = await import('@/lib/radio-sync')
    if (!await runRadioSyncNow()) return false
    const state = await getRadioSyncState()
    if (state.status === 'failed' || state.failed > 0) throw new Error(state.error || state.message || 'Radio sync failed.')
    return state.message || 'Radio sync completed.'
  }
  if (jobId === 'students') {
    const { getStudentImportState, runStudentImportSync } = await import('@/lib/student-import')
    if (!await runStudentImportSync()) return false
    const state = await getStudentImportState()
    if (state.status === 'failed') throw new Error(state.error || 'Student import failed.')
    return `Student import completed: ${state.added} added, ${state.skipped} updated.`
  }
  if (jobId === 'bosses') {
    const { getRaidBossImportState, runRaidBossImportSync } = await import('@/lib/raid-boss-import')
    if (!await runRaidBossImportSync()) return false
    const state = await getRaidBossImportState()
    if (state.status === 'failed') throw new Error(state.error || 'Raid boss import failed.')
    return `Raid boss import completed: ${state.added} added, ${state.skipped} unchanged.`
  }
  if (jobId === 'plana') {
    const { getPlanaImportState, runPlanaImportSync } = await import('@/lib/plana-import')
    if (!await runPlanaImportSync('new')) return false
    const state = await getPlanaImportState()
    if (state.status === 'failed') throw new Error(state.error || 'Plana import failed.')
    return state.message || 'Plana import completed.'
  }

  const { getMemorialMediaSyncState, runMemorialMediaSyncNow } = await import('@/lib/memorial-media-sync')
  if (!await runMemorialMediaSyncNow({ trigger: 'scheduled', scheduledAt })) return false
  const state = await getMemorialMediaSyncState()
  if (state.status === 'failed') throw new Error(state.error || 'Memorial media sync failed.')
  return state.message || 'Memorial media sync completed.'
}

async function acquireMaintenanceLock(jobId: MaintenanceJobId) {
  await prisma.maintenanceSchedulerLock.upsert({
    where: { id: LOCK_ID },
    update: {},
    create: { id: LOCK_ID },
  })
  const holder = randomUUID()
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS)
  const claimed = await prisma.maintenanceSchedulerLock.updateMany({
    where: { id: LOCK_ID, OR: [{ holder: null }, { updatedAt: { lt: staleBefore } }] },
    data: { holder, jobId },
  })
  return claimed.count ? holder : null
}

async function hasActiveImport() {
  const states = await Promise.all([
    prisma.radioSyncState.findUnique({ where: { id: 'bluearchive-global-radio' }, select: { status: true } }),
    prisma.studentImportState.findUnique({ where: { id: 'schaledb-students' }, select: { status: true } }),
    prisma.raidBossImportState.findUnique({ where: { id: 'schaledb-raid-bosses' }, select: { status: true } }),
    prisma.planaImportState.findUnique({ where: { id: 'plana-stats' }, select: { status: true } }),
    prisma.memorialMediaSyncState.findUnique({ where: { id: 'jaymie-memorial-media' }, select: { status: true } }),
  ])
  return states.some((state) => state?.status === 'running')
}

async function heartbeatMaintenanceRun(holder: string, runId: string) {
  const now = new Date()
  await Promise.all([
    prisma.maintenanceSchedulerLock.updateMany({ where: { id: LOCK_ID, holder }, data: { updatedAt: now } }),
    prisma.maintenanceJobRun.updateMany({ where: { id: runId, status: 'running' }, data: { updatedAt: now } }),
  ])
}

async function releaseMaintenanceLock(holder: string) {
  await prisma.maintenanceSchedulerLock.updateMany({
    where: { id: LOCK_ID, holder },
    data: { holder: null, jobId: null },
  })
}

async function recoverStaleRuns(now: Date) {
  const staleBefore = new Date(now.getTime() - LOCK_STALE_MS)
  await prisma.maintenanceJobRun.updateMany({
    where: { status: 'running', updatedAt: { lt: staleBefore } },
    data: { status: 'pending', startedAt: null, message: 'Previous scheduler process stopped; waiting within the schedule window.' },
  })
}

async function expirePendingRuns(now: Date) {
  const expiredBefore = new Date(now.getTime() - MAINTENANCE_WINDOW_MS)
  await prisma.maintenanceJobRun.updateMany({
    where: { status: 'pending', scheduledAt: { lte: expiredBefore } },
    data: { status: 'skipped', message: 'Skipped after the 10-minute schedule window remained busy.', completedAt: now },
  })
}

function isJobEnabled(jobId: MaintenanceJobId) {
  return process.env[JOB_ENV[jobId]] !== 'disabled'
}

function nextMinuteDelay() {
  return TICK_MS - Date.now() % TICK_MS + 100
}
