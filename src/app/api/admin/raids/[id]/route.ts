import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { withRaidActivity } from '@/lib/raid-activity'
import { resolveRaidServer, resolveRaidTerrain, resolveRaidType } from '@/lib/raid-lookups'
import { withAdminMutationAudit } from '@/lib/admin-activity'

const raidInclude = {
  raidBoss: true,
  type: true,
  server: true,
  terrain: true,
} as const

async function put(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  invalidatePublicData()
  return NextResponse.json(withRaidActivity([raid])[0])
}

async function del(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  await prisma.raidEntry.deleteMany({ where: { raidId: id } })
  const deleted = await prisma.raid.delete({ where: { id } })
  invalidatePublicData()
  return NextResponse.json({ ok: true, deleted })
}

export const PUT = withAdminMutationAudit({ action: 'UPDATE', entityType: 'raid' }, put)
export const DELETE = withAdminMutationAudit({ action: 'DELETE', entityType: 'raid' }, del)
