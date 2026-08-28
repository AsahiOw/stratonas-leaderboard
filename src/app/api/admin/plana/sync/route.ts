import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { getPlanaImportStatus, startPlanaImport } from '@/lib/plana-import'
import type { PlanaImportMode } from '@/lib/plana-manifest'

export const dynamic = 'force-dynamic'

async function post(request: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  const body = await request.json().catch(() => ({})) as { mode?: unknown }
  const mode: PlanaImportMode = body.mode === undefined ? 'new' : body.mode as PlanaImportMode
  if (mode !== 'new' && mode !== 'backfill') {
    return NextResponse.json({ error: 'Mode must be "new" or "backfill".' }, { status: 400 })
  }

  const started = await startPlanaImport(mode, { audit: true })
  if (!started) {
    const state = await getPlanaImportStatus()
    return NextResponse.json({ error: 'Plana import is already running.', state }, { status: 409 })
  }

  return NextResponse.json(await getPlanaImportStatus(), { status: 202 })
}

export const POST = post
