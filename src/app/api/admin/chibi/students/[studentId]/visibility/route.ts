import { prisma } from '@/lib/prisma'
import { recordAdminActivity } from '@/lib/admin-activity'
import { isEligibleStudentId } from '@/lib/chibi/types'
import { ChibiInputError, ChibiStaleError, record } from '@/lib/chibi/api-input'
import { CHIBI_ARRANGEMENT_SCHEMA_VERSION } from '@/lib/chibi/arrangement'
import { adminChibiRequest, noStoreJson } from '@/lib/chibi/http'

export const dynamic = 'force-dynamic'

function requiredString(value: unknown, label: string, maxLength = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw new ChibiInputError(`${label} is invalid.`)
  return value.trim()
}

function visibilityInput(value: unknown) {
  const body = record(value)
  for (const key of Object.keys(body)) if (!['schemaVersion', 'assetId', 'checksum', 'catalogVisible'].includes(key)) throw new ChibiInputError(`Invalid visibility field: ${key}.`)
  if (body.schemaVersion !== CHIBI_ARRANGEMENT_SCHEMA_VERSION) throw new ChibiInputError(`Visibility schemaVersion must be ${CHIBI_ARRANGEMENT_SCHEMA_VERSION}.`)
  if (typeof body.catalogVisible !== 'boolean') throw new ChibiInputError('catalogVisible must be boolean.')
  return {
    assetId: requiredString(body.assetId, 'The active asset ID'),
    checksum: requiredString(body.checksum, 'The active asset checksum', 128),
    catalogVisible: body.catalogVisible,
  }
}

export async function PUT(request: Request, context: { params: Promise<{ studentId: string }> }) {
  return adminChibiRequest(async () => {
    const studentId = Number((await context.params).studentId)
    if (!isEligibleStudentId(studentId)) throw new ChibiInputError('Select an eligible student.')
    const input = visibilityInput(await request.json())
    const result = await prisma.$transaction(async tx => {
      const binding = await tx.studentChibiBinding.findUnique({
        where: { studentId }, include: { asset: { select: { id: true, checksum: true } } },
      })
      if (!binding?.asset || binding.asset.id !== input.assetId || binding.asset.checksum !== input.checksum) {
        throw new ChibiStaleError('The active character asset changed. Refresh the admin roster and try again.')
      }
      const updated = await tx.studentChibiBinding.updateMany({
        where: { studentId, assetId: input.assetId, asset: { checksum: input.checksum } }, data: { catalogVisible: input.catalogVisible },
      })
      if (updated.count !== 1) throw new ChibiStaleError('The active character asset changed. Refresh the admin roster and try again.')
      return { studentId, assetId: input.assetId, checksum: input.checksum, catalogVisible: input.catalogVisible }
    })
    await recordAdminActivity({ action: 'UPDATE', entityType: 'chibi visibility', entityId: String(studentId),
      summary: `${result.catalogVisible ? 'Published' : 'Hid'} chibi student ${studentId} in the public catalog`, details: result })
    return noStoreJson(result)
  })
}
