import { readImportInput } from '@/lib/chibi/api-input'
import { enqueueChibiJob, publicJob } from '@/lib/chibi/server'
import { adminChibiRequest, chibiRequesterId, noStoreJson } from '@/lib/chibi/http'
import { recordAdminActivity } from '@/lib/admin-activity'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  return adminChibiRequest(async () => {
    const input = readImportInput(await request.json())
    const job = await enqueueChibiJob({ ...input, requesterId: await chibiRequesterId() })
    await recordAdminActivity({ action: 'IMPORT', entityType: 'chibi import', entityId: job.id, summary: `Queued chibi ${input.mode}`, details: input })
    return noStoreJson({ jobId: job.id, job: publicJob(job) }, 202)
  })
}
