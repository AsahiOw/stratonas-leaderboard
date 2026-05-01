import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const boss = await prisma.raidBoss.update({
    where: { id: params.id },
    data: {
      name:        body.name,
      description: body.description || '',
      image:       body.image || null,
      color:       body.color  || '#4f8ef7',
      color2:      body.color2 || '#7c3aed',
      pattern:     body.pattern || 'hex',
    },
  })
  await prisma.raid.updateMany({
    where: { raidBossId: params.id },
    data: {
      color:   boss.color,
      color2:  boss.color2,
      pattern: boss.pattern,
    },
  })
  return NextResponse.json(boss)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  await prisma.raidBoss.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
