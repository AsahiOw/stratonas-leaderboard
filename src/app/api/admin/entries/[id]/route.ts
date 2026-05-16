import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  return NextResponse.json(entry)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  await prisma.raidEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
