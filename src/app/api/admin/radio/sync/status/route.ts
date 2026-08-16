import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getRadioSyncState } from '@/lib/radio-sync'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  return NextResponse.json(await getRadioSyncState())
}
