import { syncXNews } from '@/lib/x-news'

const INTERVAL_MS = 10 * 60 * 1000
const globalForScheduler = globalThis as unknown as { xNewsSchedulerStarted?: boolean; xNewsSchedulerTimer?: NodeJS.Timeout }

export function startXNewsScheduler() {
  if (globalForScheduler.xNewsSchedulerStarted) return
  globalForScheduler.xNewsSchedulerStarted = true
  const run = async () => {
    try { await syncXNews() } catch (error) { console.error('X news scheduler failed', error) }
  }
  const initial = setTimeout(() => void run(), 10_000)
  initial.unref?.()
  const interval = setInterval(() => void run(), INTERVAL_MS)
  interval.unref?.()
  globalForScheduler.xNewsSchedulerTimer = interval
}
