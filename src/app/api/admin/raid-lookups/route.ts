import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { recordAdminActivity } from '@/lib/admin-activity'

export const dynamic = 'force-dynamic'

const DEFAULT_TYPES = ['Total Assault', 'Grand Assault']
const DEFAULT_SERVERS = ['Global', 'Japan']
const DEFAULT_TERRAINS = ['Urban', 'Indoor', 'Outdoor']

function lookupId(prefix: string, name: string): string {
  return `${prefix}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  const [existingTypes, existingServers, existingTerrains] = await Promise.all([
    prisma.raidType.findMany({ select: { name: true } }),
    prisma.raidServer.findMany({ select: { name: true } }),
    prisma.raidTerrain.findMany({ select: { name: true } }),
  ])
  const missingTypes = DEFAULT_TYPES.filter((name) => !existingTypes.some((item) => item.name === name))
  const missingServers = DEFAULT_SERVERS.filter((name) => !existingServers.some((item) => item.name === name))
  const missingTerrains = DEFAULT_TERRAINS.filter((name) => !existingTerrains.some((item) => item.name === name))
  const [createdTypes, createdServers, createdTerrains] = await Promise.all([
    missingTypes.length ? prisma.raidType.createMany({ data: missingTypes.map((name) => ({ id: lookupId('raidtype', name), name })), skipDuplicates: true }) : { count: 0 },
    missingServers.length ? prisma.raidServer.createMany({ data: missingServers.map((name) => ({ id: lookupId('raidserver', name), name })), skipDuplicates: true }) : { count: 0 },
    missingTerrains.length ? prisma.raidTerrain.createMany({ data: missingTerrains.map((name) => ({ id: lookupId('raidterrain', name), name })), skipDuplicates: true }) : { count: 0 },
  ])
  const created = createdTypes.count + createdServers.count + createdTerrains.count
  if (created > 0) {
    await recordAdminActivity({
      action: 'CREATE',
      entityType: 'raid lookup defaults',
      summary: `Created ${created} missing raid lookup default${created === 1 ? '' : 's'}`,
      details: { types: missingTypes, servers: missingServers, terrains: missingTerrains },
    })
  }

  const [types, servers, terrains] = await Promise.all([
    prisma.raidType.findMany({ orderBy: { name: 'asc' } }),
    prisma.raidServer.findMany({ orderBy: { name: 'asc' } }),
    prisma.raidTerrain.findMany({ orderBy: { name: 'asc' } }),
  ])

  return NextResponse.json({ types, servers, terrains })
}
