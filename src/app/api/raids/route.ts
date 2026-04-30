import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const raids = await prisma.raid.findMany({
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
  })
  return NextResponse.json(raids)
}
