import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getMemorialMediaSyncState, startMemorialMediaSync } from '@/lib/memorial-media-sync'
import { withAdminMutationAudit } from '@/lib/admin-activity'

export const dynamic = 'force-dynamic'

async function post(_req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  const started = await startMemorialMediaSync({ trigger: 'manual' })
  if (!started) {
    const state = await getMemorialMediaSyncState()
    return NextResponse.json({ error: 'Memorial media sync is already running', state }, { status: 409 })
  }

  const state = await getMemorialMediaSyncState()
  return NextResponse.json(state, { status: 202 })
}

export const POST = withAdminMutationAudit({ action: 'SYNC', entityType: 'memorial media' }, post)
