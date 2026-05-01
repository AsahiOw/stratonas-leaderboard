import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  const clubs = await prisma.club.findMany({
    include: { _count: { select: { players: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(clubs)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Club name is required.' }, { status: 400 })

  const existing = await prisma.club.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) return NextResponse.json({ error: 'Club already exists.' }, { status: 409 })

  const club = await prisma.club.create({ data: { name } })
  return NextResponse.json(club, { status: 201 })
}
