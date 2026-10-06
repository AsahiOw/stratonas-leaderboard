import { controlChibiJob, publicJob } from '@/lib/chibi/server'
import { ChibiInputError } from '@/lib/chibi/api-input'
import { adminChibiRequest, noStoreJson } from '@/lib/chibi/http'
import { recordAdminActivity } from '@/lib/admin-activity'

export const dynamic = 'force-dynamic'
export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  return adminChibiRequest(async () => {
    const input = await request.json()
    const action = input?.action
    if (action !== 'pause' && action !== 'resume') throw new ChibiInputError('Choose pause or resume.')
    const { jobId } = await params
    const job = await controlChibiJob(jobId, action)
    await recordAdminActivity({ action: 'IMPORT', entityType: 'chibi import', entityId: jobId, summary: `${action === 'pause' ? 'Paused' : 'Resumed'} chibi import`, details: { action } })
    return noStoreJson({ job: publicJob(job) }, 202)
  })
}
