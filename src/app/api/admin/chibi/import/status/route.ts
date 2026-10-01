import { prisma } from '@/lib/prisma'
import { activeJobWhere, publicJob } from '@/lib/chibi/server'
import { adminChibiRequest, noStoreJson } from '@/lib/chibi/http'
import { assessChibiWorkerReadiness, currentChibiReadinessDiagnostics, type ChibiReadinessDiagnostic } from '@/lib/chibi/worker-readiness'
import { readChibiProgress } from '@/lib/chibi/import-progress'

export const dynamic = 'force-dynamic'
export async function GET() {
  return adminChibiRequest(async () => {
    const [active, latest, workers, lastSuccess] = await Promise.all([
      prisma.chibiImportJob.findFirst({ where: activeJobWhere, orderBy: { createdAt: 'asc' } }),
      prisma.chibiImportJob.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.chibiWorkerState.findMany({ orderBy: { lastHeartbeat: 'desc' }, take: 10 }),
      prisma.chibiImportJob.findFirst({ where: { status: 'completed', failed: 0, mode: { in: ['update', 'force-rebuild', 'retry-failed', 'mapping'] } }, orderBy: { completedAt: 'desc' }, select: { completedAt: true } }),
    ])
    const now = Date.now()
    const workerRows = workers.map(worker => {
      const online = now - worker.lastHeartbeat.getTime() < 90_000
      const readiness = assessChibiWorkerReadiness(worker, now)
      return { ...worker, online, readiness }
    })
    const diagnostics: ChibiReadinessDiagnostic[] = currentChibiReadinessDiagnostics(workerRows, active?.workerId)
    if (!workerRows.length) diagnostics.push({ id: 'worker-missing', label: 'worker', detail: 'No Chibi worker has reported a heartbeat.', remediation: 'Start the Chibi worker after completing npm run chibi:setup.' })
    const job = active ?? latest
    const worker = workerRows.find(worker => worker.id === job?.workerId)
    const [activeItems, processingTiming] = active ? await Promise.all([prisma.chibiImportItem.findMany({
      where: { jobId: active.id, status: 'running' }, orderBy: { updatedAt: 'desc' }, take: 10,
      select: { studentId: true, stage: true, student: { select: { name: true } } },
    }), prisma.chibiImportItem.aggregate({ where: { jobId: active.id }, _min: { createdAt: true } })]) : [[], null]
    return noStoreJson({
      checkedAt: now,
      job: job ? publicJob(job) : null,
      progress: job && worker ? readChibiProgress(worker.details, job.id) : [],
      activeItems,
      processingStartedAt: processingTiming?._min.createdAt ?? null,
      workers: workerRows,
      ready: workerRows.some(worker => worker.readiness.ready),
      readiness: { ready: workerRows.some(worker => worker.readiness.ready), diagnostics },
      lastSuccessfulImport: lastSuccess?.completedAt || null,
    })
  })
}
