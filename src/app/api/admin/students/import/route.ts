import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getStudentImportState, startStudentImport } from '@/lib/student-import'

export const dynamic = 'force-dynamic'

async function post(_req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  const started = await startStudentImport({ audit: true })
  if (!started) {
    const state = await getStudentImportState()
    return NextResponse.json({ error: 'Student import is already running', state }, { status: 409 })
  }

  const state = await getStudentImportState()
  return NextResponse.json(state, { status: 202 })
}

export const POST = post
