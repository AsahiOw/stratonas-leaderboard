import './chibi-runtime'

import { hostname } from 'node:os'
import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

import { prisma } from '../src/lib/prisma'
import { chibiRoots } from '../src/lib/chibi/storage'
import { scanSourceInventory } from '../src/lib/chibi/inventory'
import { acquireWorkerLock, claimNextJob, processJob, recoverExpiredLeases } from '../src/lib/chibi/engine-db'
import { renewLease } from '../src/lib/chibi/engine-db'
import { mapStudentToSources } from '../src/lib/chibi/mapping'
import { chibiRepositoryRoot } from './chibi-runtime'
import { resolveChibiRoots, runChibiPreflight, type ChibiPreflightResult } from './chibi-preflight'
import { appendChibiProgress, type ChibiProgressEntry } from '../src/lib/chibi/import-progress'
import { downloadAssetBundles, prepareBaadSource } from './chibi-baad'

const workerId = `${hostname()}:${process.pid}`
const once = process.argv.includes('--once')
const inventoryOnly = process.argv.includes('--inventory')
let stopping = false
let currentAbort: AbortController | null = null
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  stopping = true
  currentAbort?.abort(new Error('Chibi worker is stopping.'))
})
let jobProgress: { jobId: string; progress: ChibiProgressEntry[] } | null = null

async function writeCoverage(report: Awaited<ReturnType<typeof scanSourceInventory>>) {
  const students = await prisma.student.findMany({
    where: { id: { gte: 10000, lte: 99999 } }, select: { id: true, name: true, pathName: true, devName: true }, orderBy: { id: 'asc' },
  })
  const rows = students.map(student => {
    const decision = mapStudentToSources(student, report.candidates)
    const sourceIdentity = decision.status === 'mapped' ? decision.source.sourceIdentity : null
    return { ...student, sourceIdentity, status: sourceIdentity ? 'exact-candidate' : decision.status, diagnostic: decision.status === 'mapped' ? null : decision.reason }
  })
  const output = path.join(chibiRoots().data, 'reports', `coverage-${new Date().toISOString().replaceAll(':', '-')}.json`)
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), eligible: rows.length, exactCandidates: rows.filter(row => row.sourceIdentity).length, unresolved: rows.filter(row => !row.sourceIdentity).length, sourceCandidates: report.candidates.length, sourceErrors: report.errors, students: rows }, null, 2))
  console.log(`Coverage report: ${output}`)
}

async function heartbeat(ready: boolean, details: Record<string, unknown>) {
  details = { ...jobProgress, ...details }
  await prisma.chibiWorkerState.upsert({
    where: { id: workerId },
    create: { id: workerId, platform: `${process.platform}/${process.arch}`, lastHeartbeat: new Date(), ready, details: details as any },
    update: { lastHeartbeat: new Date(), ready, details: details as any },
  })
}

async function heartbeatSafely(ready: boolean, details: Record<string, unknown>) {
  try {
    await heartbeat(ready, details)
  } catch (error) {
    console.error(`Could not write Chibi worker heartbeat: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function logPreflightFailure(preflight: ChibiPreflightResult) {
  console.error('Chibi worker preflight failed; the worker will not advertise ready or process jobs.')
  for (const failure of preflight.failures) {
    console.error(`- ${failure.label}: ${failure.detail}${failure.remediation ? ` — ${failure.remediation}` : ''}`)
  }
}

async function main() {
  const roots = resolveChibiRoots(chibiRepositoryRoot)
  if (inventoryOnly) {
    const preflight = await runChibiPreflight({ roots })
    if (!preflight.ready) {
      logPreflightFailure(preflight)
      process.exitCode = 1
      return
    }
    const report = await scanSourceInventory()
    await writeCoverage(report)
    return
  }
  do {
    const downloadPending = await prisma.chibiImportJob.findFirst({ where: { mode: 'download-assets', status: { in: ['queued', 'running'] } }, select: { id: true } })
    const preflight = await runChibiPreflight({ roots, downloadSource: !!downloadPending })
    if (!preflight.ready) {
      logPreflightFailure(preflight)
      await heartbeatSafely(false, { state: 'preflight-failed', preflight })
      if (once) {
        process.exitCode = 1
        return
      }
      await delay(5_000)
      continue
    }
    await heartbeat(true, { state: 'starting', preflight })
    const lock = await acquireWorkerLock()
    if (!lock) {
      await heartbeat(true, { state: 'waiting', waiting: 'Another worker owns the import advisory lock.', preflight })
      if (once) return
      await delay(5_000)
      continue
    }
    let activeJob: Awaited<ReturnType<typeof claimNextJob>> = null
    let renewal: ReturnType<typeof setInterval> | null = null
    const abort = new AbortController()
    currentAbort = abort
    let fatalError: Error | null = null
    void lock.lost.catch(error => { fatalError = error; abort.abort(error) })
    try {
      // Recovery is only authoritative while this session owns the global lock.
      if (downloadPending) await prepareBaadSource(roots.source)
      await recoverExpiredLeases(prisma)
      activeJob = await claimNextJob(prisma, workerId)
      if (!activeJob) {
        await heartbeat(true, { state: 'idle', idle: true, preflight })
        if (once) return
      } else {
        let stage = activeJob.mode === 'download-assets' ? 'download' : 'inventory'
        jobProgress = { jobId: activeJob.id, progress: [] }
        const reportProgress = (message: string) => {
          jobProgress!.progress = appendChibiProgress(jobProgress!.progress, message)
        }
        reportProgress(activeJob.mode === 'download-assets' ? 'Preparing the Japan AssetBundle download.' : 'Scanning source archives and reading model metadata. Student totals follow after inventory completes.')
        await heartbeat(true, { state: 'running', jobId: activeJob.id, stage, preflight })
        let renewalInFlight = false
        renewal = setInterval(() => {
          if (renewalInFlight || fatalError) return
          renewalInFlight = true
          Promise.all([
            renewLease(prisma, activeJob!.id, activeJob!.leaseToken!),
            heartbeat(true, { state: 'running', jobId: activeJob!.id, stage, preflight }),
          ]).catch(error => {
            fatalError = error instanceof Error ? error : new Error(String(error))
            abort.abort(fatalError)
          }).finally(() => { renewalInFlight = false })
        }, 20_000)
        renewal.unref()
        if (activeJob.mode === 'download-assets') {
          await prisma.chibiImportJob.updateMany({ where: { id: activeJob.id, status: 'running', leaseToken: activeJob.leaseToken }, data: { stage } })
          const count = await downloadAssetBundles({ sourceRoot: roots.source, toolsRoot: roots.tools, jobId: activeJob.id, signal: abort.signal, onProgress: reportProgress })
          if (fatalError) throw fatalError
          const completed = await prisma.chibiImportJob.updateMany({ where: { id: activeJob.id, status: 'running', leaseToken: activeJob.leaseToken }, data: { status: 'completed', stage: 'completed', total: count, processed: count, completedAt: new Date() } })
          if (completed.count !== 1) throw new Error('Asset download job lease was lost.')
          await heartbeat(true, { state: 'idle', jobId: activeJob.id, stage: 'completed', preflight })
        } else {
          // Each job observes a fresh, content-hashed source snapshot.
          const report = await scanSourceInventory({ onProgress: reportProgress })
          if (fatalError) throw fatalError
          stage = 'processing'
          reportProgress(`Inventory complete: ${report.files.length} source files, ${report.candidates.length} model candidates. Preparing students…`)
          await writeCoverage(report)
          await heartbeat(true, { state: 'running', jobId: activeJob.id, sourceFiles: report.files.length, sourceCandidates: report.candidates.length, sourceErrors: report.errors, preflight })
          await processJob(prisma, activeJob, report, { signal: abort.signal })
          if (fatalError) throw fatalError
          reportProgress('Import processing finished. See the student results below.')
          await heartbeat(true, { state: 'idle', jobId: activeJob.id, stage: 'completed', preflight })
        }
      }
    } catch (error) {
      console.error(error)
      if (activeJob?.leaseToken) await prisma.chibiImportJob.updateMany({
        where: { id: activeJob.id, status: 'running', leaseToken: activeJob.leaseToken },
        data: { status: 'failed', stage: 'failed', error: error instanceof Error ? error.message : String(error), completedAt: new Date() },
      })
      await heartbeatSafely(false, { state: 'failed', error: error instanceof Error ? error.message : String(error), preflight })
      if (once) throw error
    } finally {
      if (renewal) clearInterval(renewal)
      currentAbort = null
      await lock.release()
    }
    if (!once) await delay(5_000)
  } while (!once && !stopping)
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
