import { prisma } from '@/lib/prisma'
import { isEligibleStudentId } from '@/lib/chibi/types'
import { candidateClips, ChibiInputError, readProfile, record, sourceIdentity } from '@/lib/chibi/api-input'
import { enqueueChibiJob, publicJob } from '@/lib/chibi/server'
import { adminChibiRequest, chibiRequesterId, noStoreJson } from '@/lib/chibi/http'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  return adminChibiRequest(async () => {
    const input = record(await request.json())
    if (!isEligibleStudentId(input.studentId)) throw new ChibiInputError('Select an eligible student.')
    const identity = sourceIdentity(input.sourceIdentity)
    const candidate = await prisma.chibiSourceCandidate.findUnique({ where: { sourceIdentity: identity } })
    if (!candidate || candidate.conflict) throw new ChibiInputError('Select an indexed model without unresolved source conflicts.')
    const profile = input.profile ? readProfile(input.profile, candidateClips(candidate.metadata)) : undefined
    const job = await enqueueChibiJob({ mode: 'preview', requesterId: await chibiRequesterId(), studentIds: [input.studentId],
      candidate: { studentId: input.studentId, sourceIdentity: identity, fingerprint: candidate.fingerprint, profile } })
    return noStoreJson({ jobId: job.id, job: publicJob(job) }, 202)
  })
}
