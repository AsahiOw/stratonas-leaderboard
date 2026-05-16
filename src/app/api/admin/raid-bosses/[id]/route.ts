import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  const body = await req.json()
  const boss = await prisma.raidBoss.update({
    where: { id },
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
    where: { raidBossId: id },
    data: {
      color:   boss.color,
      color2:  boss.color2,
      pattern: boss.pattern,
    },
  })
  invalidatePublicData()
  return NextResponse.json(boss)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  await prisma.raidBoss.delete({ where: { id } })
  invalidatePublicData()
  return NextResponse.json({ ok: true })
}
