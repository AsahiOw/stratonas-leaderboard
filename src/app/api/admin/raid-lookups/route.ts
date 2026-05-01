import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

const DEFAULT_TYPES = ['Total Assault', 'Grand Assault']
const DEFAULT_SERVERS = ['Global', 'Japan']

function lookupId(prefix: string, name: string): string {
  return `${prefix}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  await Promise.all([
    ...DEFAULT_TYPES.map((name) => prisma.raidType.upsert({
      where: { name },
      update: {},
      create: { id: lookupId('raidtype', name), name },
    })),
    ...DEFAULT_SERVERS.map((name) => prisma.raidServer.upsert({
      where: { name },
      update: {},
      create: { id: lookupId('raidserver', name), name },
    })),
  ])

  const [types, servers] = await Promise.all([
    prisma.raidType.findMany({ orderBy: { name: 'asc' } }),
    prisma.raidServer.findMany({ orderBy: { name: 'asc' } }),
  ])

  return NextResponse.json({ types, servers })
}
