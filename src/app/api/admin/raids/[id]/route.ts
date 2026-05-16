import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { resolveRaidServer, resolveRaidTerrain, resolveRaidType } from '@/lib/raid-lookups'

const raidInclude = {
  raidBoss: true,
  type: true,
  server: true,
  terrain: true,
} as const

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  const body = await req.json()
  const boss = await prisma.raidBoss.findUnique({ where: { id: body.raidBossId } })
  const type = await resolveRaidType(body.typeId)
  const server = await resolveRaidServer(body.serverId)
  const terrain = await resolveRaidTerrain(body.terrainId)
  if (!boss || !type || !server || !terrain) {
    return NextResponse.json({ error: 'Raid boss, type, server, and terrain are required' }, { status: 400 })
  }
  const raid = await prisma.raid.update({
    where: { id },
    data: {
      raidBossId: body.raidBossId,
      season:     Number(body.season) || 1,
      typeId:     type.id,
      serverId:   server.id,
      terrainId:  terrain.id,
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  await prisma.raidEntry.deleteMany({ where: { raidId: id } })
  await prisma.raid.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
