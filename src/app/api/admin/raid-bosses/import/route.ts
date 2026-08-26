import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getRaidBossImportState, startRaidBossImport } from '@/lib/raid-boss-import'
import { withAdminMutationAudit } from '@/lib/admin-activity'

export const dynamic = 'force-dynamic'

async function post(_req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  const started = await startRaidBossImport()
  if (!started) {
    const state = await getRaidBossImportState()
    return NextResponse.json({ error: 'Raid boss import is already running', state }, { status: 409 })
  }

  const state = await getRaidBossImportState()
  return NextResponse.json(state, { status: 202 })
}

export const POST = withAdminMutationAudit({ action: 'IMPORT', entityType: 'raid bosses' }, post)
