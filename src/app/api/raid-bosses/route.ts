import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const bosses = await prisma.raidBoss.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(bosses)
}
