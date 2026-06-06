import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'

function bossErrorResponse(error: unknown, fallback = 'Could not save boss.') {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A boss with this name already exists.' }, { status: 409 })
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Boss not found.' }, { status: 404 })
    }
  }
  return NextResponse.json({ error: fallback }, { status: 500 })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Boss name is required.' }, { status: 400 })
  try {
    const boss = await prisma.raidBoss.update({
      where: { id },
      data: {
        name,
        description: body.description || '',
        image:       body.image || null,
        color:       body.color  || '#4f8ef7',
        color2:      body.color2 || '#7c3aed',
        pattern:     body.pattern || 'hex',
      },
    })
    await prisma.raid.updateMany({
      where: { raidBossId: id },
      data: {
        color:   boss.color,
        color2:  boss.color2,
        pattern: boss.pattern,
      },
    })
    invalidatePublicData()
    return NextResponse.json(boss)
  } catch (error) {
    return bossErrorResponse(error)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  try {
    await prisma.raidBoss.delete({ where: { id } })
    invalidatePublicData()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return bossErrorResponse(error, 'Could not delete boss.')
  }
}
