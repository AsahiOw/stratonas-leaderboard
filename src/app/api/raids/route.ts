import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const raidInclude = {
  raidBoss: true,
  type: true,
  server: true,
} as const

export async function GET() {
  const raids = await prisma.raid.findMany({
    include: raidInclude,
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
  })
  return NextResponse.json(raids)
}
