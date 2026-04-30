import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const bosses = await prisma.raidBoss.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(bosses)
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
    },
  })
  return NextResponse.json(boss, { status: 201 })
}
