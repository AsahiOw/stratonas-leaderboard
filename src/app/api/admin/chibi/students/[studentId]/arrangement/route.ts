import { prisma } from '@/lib/prisma'
import { recordAdminActivity } from '@/lib/admin-activity'
import { isEligibleStudentId } from '@/lib/chibi/types'
import { ChibiInputError, ChibiStaleError, record } from '@/lib/chibi/api-input'
import { jsonValue } from '@/lib/chibi/server'
import {
  CHIBI_ARRANGEMENT_SCHEMA_VERSION,
  buildChibiArrangementAllowedNodes,
  mergeChibiArrangementDelta,
  parseAllowedChibiArrangementOverride,
  parseChibiArrangementDelta,
} from '@/lib/chibi/arrangement'
import { adminChibiRequest, noStoreJson } from '@/lib/chibi/http'

export const dynamic = 'force-dynamic'

function requiredString(value: unknown, label: string, maxLength = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw new ChibiInputError(`${label} is invalid.`)
  return value.trim()
}

function arrangementInput(value: unknown) {
  const body = record(value)
  for (const key of Object.keys(body)) if (!['schemaVersion', 'assetId', 'checksum', 'override'].includes(key)) throw new ChibiInputError(`Invalid arrangement field: ${key}.`)
  if (body.schemaVersion !== CHIBI_ARRANGEMENT_SCHEMA_VERSION) throw new ChibiInputError(`Arrangement schemaVersion must be ${CHIBI_ARRANGEMENT_SCHEMA_VERSION}.`)
  return {
    assetId: requiredString(body.assetId, 'The active asset ID'),
    checksum: requiredString(body.checksum, 'The active asset checksum', 128),
    rawOverride: body.override,
  }
}

export async function PUT(request: Request, context: { params: Promise<{ studentId: string }> }) {
  return adminChibiRequest(async () => {
    const studentId = Number((await context.params).studentId)
    if (!isEligibleStudentId(studentId)) throw new ChibiInputError('Select an eligible student.')
    const input = arrangementInput(await request.json())
    const result = await prisma.$transaction(async tx => {
      const binding = await tx.studentChibiBinding.findUnique({
        where: { studentId },
        include: { asset: { select: { id: true, checksum: true, validation: true, arrangementDefault: true } } },
      })
      if (!binding?.asset || binding.asset.id !== input.assetId || binding.asset.checksum !== input.checksum) {
        throw new ChibiStaleError('The active character asset changed. Refresh the admin roster and try again.')
      }
      const arrangementDefault = parseChibiArrangementDelta((binding.asset as { arrangementDefault?: unknown }).arrangementDefault ?? {}, 'arrangementDefault')
      const override = parseAllowedChibiArrangementOverride(input.rawOverride, binding.asset.validation, arrangementDefault, 'override')
      const updated = await tx.studentChibiBinding.updateMany({
        where: { studentId, assetId: input.assetId, asset: { checksum: input.checksum } },
        data: { arrangementOverride: jsonValue(override) },
      })
      if (updated.count !== 1) throw new ChibiStaleError('The active character asset changed. Refresh the admin roster and try again.')
      const allowedNodes = buildChibiArrangementAllowedNodes(binding.asset.validation)
      return { studentId, assetId: input.assetId, checksum: input.checksum, arrangementOverride: override,
        arrangement: { assetId: input.assetId, checksum: input.checksum, arrangementDefault,
          effectiveArrangement: mergeChibiArrangementDelta(arrangementDefault, override), allowedNodes } }
    })
    await recordAdminActivity({ action: 'UPDATE', entityType: 'chibi arrangement', entityId: String(studentId),
      summary: `Updated chibi arrangement for student ${studentId}`, details: { assetId: result.assetId, checksum: result.checksum, arrangementOverride: result.arrangementOverride } })
    return noStoreJson(result)
  })
}
