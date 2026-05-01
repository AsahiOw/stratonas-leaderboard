import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getRaidBossImportState, startRaidBossImport } from '@/lib/raid-boss-import'

export const dynamic = 'force-dynamic'

export async function POST() {
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
