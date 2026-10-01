import { prisma } from '@/lib/prisma'
import { isEligibleStudentId } from '@/lib/chibi/types'
import { candidateClips } from '@/lib/chibi/api-input'
import { adminChibiRequest, noStoreJson } from '@/lib/chibi/http'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  return adminChibiRequest(async () => {
    const query = new URL(request.url).searchParams
    const studentId = Number(query.get('studentId'))
    if (!isEligibleStudentId(studentId)) return noStoreJson({ error: 'Invalid eligible student ID.' }, 400)
    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { chibiBinding: true } })
    if (!student) return noStoreJson({ error: 'Student not found.' }, 404)
    const candidates = await prisma.chibiSourceCandidate.findMany({ orderBy: { sourceIdentity: 'asc' } })
    return noStoreJson({ student, candidates: candidates.map(candidate => ({
      sourceIdentity: candidate.sourceIdentity, fingerprint: candidate.fingerprint,
      conflict: candidate.conflict, clips: candidateClips(candidate.metadata),
    })) })
  })
}
