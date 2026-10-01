import { prisma } from '@/lib/prisma'
import { eligibleStudentsWhere } from '@/lib/chibi/server'
import { adminChibiRequest, noStoreJson } from '@/lib/chibi/http'
import {
  buildChibiArrangementAllowedNodes,
  mergeChibiArrangementDelta,
  parseAllowedChibiArrangementDelta,
  parseChibiArrangementDelta,
} from '@/lib/chibi/arrangement'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const includeHidden = new URL(request.url).searchParams.get('includeHidden') !== '0'
  return adminChibiRequest(async () => {
    const students = await prisma.student.findMany({
      where: eligibleStudentsWhere, orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, pathName: true, image: true, portrait: true,
        chibiBinding: { include: { asset: { select: { id: true, checksum: true, published: true, sourceIdentity: true, clips: true, validation: true, arrangementDefault: true } } } },
        chibiImportItems: { orderBy: { updatedAt: 'desc' }, take: 1, select: { stage: true, status: true, diagnostic: true, jobId: true } },
      },
    })
    return noStoreJson({ students: students
      .filter(student => includeHidden || student.chibiBinding?.catalogVisible !== false)
      .map(student => {
        const asset = student.chibiBinding?.asset
        const allowedNodes = buildChibiArrangementAllowedNodes(asset?.validation)
        const arrangementDefault = parseChibiArrangementDelta(asset?.arrangementDefault ?? {}, 'arrangementDefault')
        const arrangementOverride = parseAllowedChibiArrangementDelta(student.chibiBinding?.arrangementOverride ?? {}, asset?.validation, 'arrangementOverride')
        return {
          ...student,
          catalogVisible: student.chibiBinding?.catalogVisible !== false,
          arrangementAllowedNodes: allowedNodes,
          arrangement: asset ? {
            assetId: asset.id,
            checksum: asset.checksum,
            arrangementDefault,
            effectiveArrangement: mergeChibiArrangementDelta(arrangementDefault, arrangementOverride),
            allowedNodes,
          } : null,
        }
      }) })
  })
}
