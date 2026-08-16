import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getPlanaImportStatus } from '@/lib/plana-import'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  return NextResponse.json(await getPlanaImportStatus())
}
