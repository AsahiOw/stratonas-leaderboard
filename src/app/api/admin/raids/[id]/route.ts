import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

const raidInclude = {
  raidBoss: true,
  type: true,
  server: true,
} as const

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const boss = await prisma.raidBoss.findUnique({ where: { id: body.raidBossId } })
  const raid = await prisma.raid.update({
    where: { id: params.id },
    data: {
      raidBossId: body.raidBossId,
      season:     Number(body.season) || 1,
      typeId:     body.typeId,
      serverId:   body.serverId,
      color:      boss?.color  || '#4f8ef7',
      color2:     boss?.color2 || '#7c3aed',
      pattern:    boss?.pattern || 'hex',
      startDate:  body.startDate ? new Date(body.startDate) : null,
      endDate:    body.endDate   ? new Date(body.endDate)   : null,
    },
    include: raidInclude,
  })
  return NextResponse.json(raid)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  await prisma.raidEntry.deleteMany({ where: { raidId: params.id } })
  await prisma.raid.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
