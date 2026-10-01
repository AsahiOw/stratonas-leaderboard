import { prisma } from '@/lib/prisma'
import { publicJob } from '@/lib/chibi/server'
import { adminChibiRequest, noStoreJson } from '@/lib/chibi/http'

export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  return adminChibiRequest(async () => {
    const { jobId } = await context.params
    const query = new URL(request.url).searchParams
    const page = Math.max(1, Math.min(100000, Number(query.get('page')) || 1))
    const pageSize = Math.max(1, Math.min(100, Number(query.get('pageSize')) || 50))
    if (!Number.isInteger(page) || !Number.isInteger(pageSize)) return noStoreJson({ error: 'Invalid pagination.' }, 400)
    const job = await prisma.chibiImportJob.findUnique({ where: { id: jobId } })
    if (!job) return noStoreJson({ error: 'Job not found.' }, 404)
    const [items, total] = await Promise.all([
      prisma.chibiImportItem.findMany({ where: { jobId }, orderBy: { studentId: 'asc' }, skip: (page - 1) * pageSize, take: pageSize,
        include: { student: { select: { name: true, pathName: true, image: true } }, asset: { select: { id: true, checksum: true, clips: true, validation: true } } } }),
      prisma.chibiImportItem.count({ where: { jobId } }),
    ])
    return noStoreJson({ job: publicJob(job), items, total, page, pageSize })
  })
}
