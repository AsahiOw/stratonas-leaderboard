import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getStudentImportState } from '@/lib/student-import'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const state = await getStudentImportState()
  return NextResponse.json(state)
}
