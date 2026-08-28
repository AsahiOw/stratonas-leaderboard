import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { withAdminMutationAudit } from '@/lib/admin-activity'

async function put(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  const body = await req.json()
  const entry = await prisma.raidEntry.update({
    where: { id },
    data: {
      score: Number(body.score) || 0,
    },
  })
  invalidatePublicData()
  return NextResponse.json(entry)
}

async function del(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  const deleted = await prisma.raidEntry.delete({ where: { id } })
  invalidatePublicData()
  return NextResponse.json({ ok: true, deleted })
}

export const PUT = withAdminMutationAudit({ action: 'UPDATE', entityType: 'raid entry' }, put)
export const DELETE = withAdminMutationAudit({ action: 'DELETE', entityType: 'raid entry' }, del)
