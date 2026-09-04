export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  if (process.env.npm_lifecycle_event === 'build') return
  if (process.env.MAINTENANCE_SCHEDULER !== 'disabled') {
    const { startMaintenanceScheduler } = await import('@/lib/maintenance-scheduler')
    startMaintenanceScheduler()
  }
}
