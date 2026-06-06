import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData, jsonWithNoStore } from '@/lib/cache'

export const dynamic = 'force-dynamic'

function bossErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return NextResponse.json({ error: 'A boss with this name already exists.' }, { status: 409 })
  }
  return NextResponse.json({ error: 'Could not save boss.' }, { status: 500 })
}

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
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Boss name is required.' }, { status: 400 })
  try {
    const boss = await prisma.raidBoss.create({
      data: {
        name,
        description: body.description || '',
        image:       body.image || null,
        color:       body.color  || '#4f8ef7',
        color2:      body.color2 || '#7c3aed',
        pattern:     body.pattern || 'hex',
      },
    })
    invalidatePublicData()
    return NextResponse.json(boss, { status: 201 })
  } catch (error) {
    return bossErrorResponse(error)
  }
}
