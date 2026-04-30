import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const entry = await prisma.raidEntry.update({
    where: { id: params.id },
    data: {
      score: Number(body.score) || 0,
      wins: Number(body.wins) || 0,
      losses: Number(body.losses) || 0,
      streak: Number(body.streak) || 0,
    },
  })
  return NextResponse.json(entry)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  await prisma.raidEntry.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
