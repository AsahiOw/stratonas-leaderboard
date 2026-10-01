import { prisma } from '@/lib/prisma'
import { recordAdminActivity } from '@/lib/admin-activity'
import { isEligibleStudentId } from '@/lib/chibi/types'
import { candidateClips, ChibiInputError, readProfile, record, sourceIdentity } from '@/lib/chibi/api-input'
import { CHIBI_ENQUEUE_LOCK, jsonValue, publicJob } from '@/lib/chibi/server'
import { adminChibiRequest, chibiRequesterId, noStoreJson } from '@/lib/chibi/http'

export const dynamic = 'force-dynamic'
export async function PUT(request: Request, context: { params: Promise<{ studentId: string }> }) {
  return adminChibiRequest(async () => {
    const studentId = Number((await context.params).studentId)
    if (!isEligibleStudentId(studentId)) throw new ChibiInputError('Select an eligible student.')
    const input = record(await request.json())
    const identity = sourceIdentity(input.sourceIdentity)
    const requesterId = await chibiRequesterId()
    const job = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHIBI_ENQUEUE_LOCK})`
      const student = await tx.student.findUnique({ where: { id: studentId } })
      if (!student) throw new ChibiInputError('Student not found.')
      const candidate = await tx.chibiSourceCandidate.findUnique({ where: { sourceIdentity: identity } })
      if (!candidate || candidate.conflict) throw new ChibiInputError('Select an indexed source without unresolved conflicts.')
      if (input.fingerprint !== candidate.fingerprint) throw new ChibiInputError('The candidate changed. Refresh and review its current revision.')
      const profile = readProfile(input.profile, candidateClips(candidate.metadata))
      const overrides = jsonValue({ sourceIdentity: identity, identityPath: student.pathName, profile, approvedCandidateFingerprint: candidate.fingerprint })
      await tx.studentChibiBinding.upsert({
        where: { studentId },
        create: { studentId, sourceIdentity: identity, identityPath: student.pathName, provenance: 'manual', overrides, status: 'queued' },
        update: { sourceIdentity: identity, provenance: 'manual', overrides, diagnostic: 'Reviewed mapping queued for validation; any previous revision with the same student identity remains active.' },
      })
      return tx.chibiImportJob.create({ data: { mode: 'mapping', requesterId, selection: [studentId],
        candidate: jsonValue({ studentId, sourceIdentity: identity, fingerprint: candidate.fingerprint, profile }) } })
    })
    await recordAdminActivity({ action: 'RESOLVE', entityType: 'chibi mapping', entityId: String(studentId),
      summary: `Approved chibi mapping for student ${studentId}`, details: { sourceIdentity: identity, jobId: job.id, profile: input.profile } })
    return noStoreJson({ jobId: job.id, job: publicJob(job) }, 202)
  })
}
