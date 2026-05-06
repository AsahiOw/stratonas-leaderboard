import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getXlsxImportProgress } from '@/lib/xlsx-import-progress'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  return NextResponse.json(getXlsxImportProgress())
}
