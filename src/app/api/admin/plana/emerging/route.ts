import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'
import { PLANA_IMPORT_ID, getPlanaImportStatus } from '@/lib/plana-import'
import { withAdminMutationAudit } from '@/lib/admin-activity'

export const dynamic = 'force-dynamic'

type OverrideBody = {
  totalRaidId?: string | null
  grandRaidId?: string | null
}

async function validateRaidId(value: string | null | undefined, raidType: string) {
  if (!value) return null
  const dataset = await prisma.planaDataset.findFirst({
    where: {
      status: 'ready',
      region: 'JP',
      raidType,
      OR: [
        { raidDate: value.split(':').at(-1) },
      ],
    },
    select: { region: true, raidType: true, raidDate: true },
  })
  const id = dataset ? `${dataset.region}:${dataset.raidType}:${dataset.raidDate}` : null
  return id === value ? id : undefined
}

async function put(request: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  const body = await request.json().catch(() => ({})) as OverrideBody
  const [totalRaidId, grandRaidId] = await Promise.all([
    validateRaidId(body.totalRaidId, 'Total Assault'),
    validateRaidId(body.grandRaidId, 'Grand Assault'),
  ])
  if (totalRaidId === undefined || grandRaidId === undefined) {
    return NextResponse.json({ error: 'Overrides must reference ready JP raids of the selected type.' }, { status: 400 })
  }

  await prisma.planaImportState.upsert({
    where: { id: PLANA_IMPORT_ID },
    update: { emergingTotalRaidId: totalRaidId, emergingGrandRaidId: grandRaidId },
    create: { emergingTotalRaidId: totalRaidId, emergingGrandRaidId: grandRaidId },
  })
  return NextResponse.json(await getPlanaImportStatus())
}

async function del(_request: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  await prisma.planaImportState.upsert({
    where: { id: PLANA_IMPORT_ID },
    update: { emergingTotalRaidId: null, emergingGrandRaidId: null },
    create: {},
  })
  return NextResponse.json(await getPlanaImportStatus())
}

export const PUT = withAdminMutationAudit({ action: 'UPDATE', entityType: 'Plana emerging raid settings' }, put)
export const DELETE = withAdminMutationAudit({ action: 'DELETE', entityType: 'Plana emerging raid settings' }, del)
