import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  return NextResponse.json(await prisma.radioTrack.findMany({ orderBy: [{ publishedAt: 'desc' }, { displayTitle: 'asc' }] }))
}
