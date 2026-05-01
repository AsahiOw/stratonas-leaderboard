import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getRaidBossImportState } from '@/lib/raid-boss-import'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const state = await getRaidBossImportState()
  return NextResponse.json(state)
}
