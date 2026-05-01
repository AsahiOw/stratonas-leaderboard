import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRaidActivity } from '@/lib/raid-activity'

export const dynamic = 'force-dynamic'

const raidInclude = {
  raidBoss: true,
  type: true,
  server: true,
} as const

export async function GET() {
  const raids = await prisma.raid.findMany({
    include: raidInclude,
    orderBy: [{ startDate: 'asc' }, { season: 'asc' }],
  })
  return NextResponse.json(withRaidActivity(raids))
}
