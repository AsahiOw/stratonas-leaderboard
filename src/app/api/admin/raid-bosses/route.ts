import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData, jsonWithNoStore } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const bosses = await prisma.raidBoss.findMany({ orderBy: { name: 'asc' } })
  return jsonWithNoStore(bosses)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const boss = await prisma.raidBoss.create({
    data: {
      name:        body.name,
      description: body.description || '',
      image:       body.image || null,
      color:       body.color  || '#4f8ef7',
      color2:      body.color2 || '#7c3aed',
      pattern:     body.pattern || 'hex',
    },
  })
  invalidatePublicData()
  return NextResponse.json(boss, { status: 201 })
}
