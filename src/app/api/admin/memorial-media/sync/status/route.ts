import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getMemorialMediaSyncState } from '@/lib/memorial-media-sync'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const state = await getMemorialMediaSyncState()
  return NextResponse.json(state)
}
