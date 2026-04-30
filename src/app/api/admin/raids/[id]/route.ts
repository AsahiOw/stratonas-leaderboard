import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { Server, RaidStatus } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const raid = await prisma.raid.update({
    where: { id: params.id },
    data: {
      name: body.name,
      episode: body.episode || null,
      season: body.season || null,
      server: body.server === 'JP' ? Server.JP : Server.GLOBAL,
      status: body.status === 'PREVIOUS' ? RaidStatus.PREVIOUS : RaidStatus.CURRENT,
      color: body.color || '#4f8ef7',
      color2: body.color2 || '#7c3aed',
      pattern: body.pattern || 'hex',
      desc: body.desc || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
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
