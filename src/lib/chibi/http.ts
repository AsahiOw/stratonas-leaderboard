import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { auth } from '@/lib/auth'
import { ChibiInputError, ChibiStaleError } from './api-input'
import { ChibiJobConflict } from './server'

export const noStoreJson = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
export async function adminChibiRequest(handler: () => Promise<Response>) {
  const guard = await requireAdmin()
  if (guard) return guard
  try { return await handler() } catch (error) {
    if (error instanceof ChibiJobConflict) return noStoreJson({ error: error.message, jobId: error.jobId }, 409)
    if (error instanceof ChibiStaleError) return noStoreJson({ error: error.message }, 409)
    if (error instanceof ChibiInputError || error instanceof SyntaxError) return noStoreJson({ error: error.message }, 400)
    console.error('Chibi admin request failed', error)
    return noStoreJson({ error: 'The chibi request could not be completed.' }, 500)
  }
}
export async function chibiRequesterId() { return (await auth())?.user?.id || null }
