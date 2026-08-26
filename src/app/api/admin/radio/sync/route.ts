import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getRadioSyncState, startRadioSync } from '@/lib/radio-sync'
import { withAdminMutationAudit } from '@/lib/admin-activity'

async function post(_req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const started = await startRadioSync()
  const state = await getRadioSyncState()
  if (!started) return NextResponse.json({ error: 'Radio sync is already running.', state }, { status: 409 })
  return NextResponse.json(state)
}

export const POST = withAdminMutationAudit({ action: 'SYNC', entityType: 'radio catalog' }, post)
