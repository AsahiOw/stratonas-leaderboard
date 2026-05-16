import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params

  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const uid = typeof body.uid === 'string' && body.uid.trim() ? body.uid.trim() : null
  const logo = typeof body.logo === 'string' && body.logo.trim() ? body.logo.trim() : null
  const color = typeof body.color === 'string' && body.color.trim() ? body.color.trim() : '#4f8ef7'
  if (!name) return NextResponse.json({ error: 'Club name is required.' }, { status: 400 })

  const duplicate = await prisma.club.findFirst({
    where: {
      id: { not: id },
      name: { equals: name, mode: 'insensitive' },
    },
  })
  if (duplicate) return NextResponse.json({ error: 'Club already exists.' }, { status: 409 })

  const club = await prisma.club.update({
    where: { id },
    data: { name, uid, logo, color },
  })
  await prisma.player.updateMany({
    where: { clubId: id },
    data: { club: name, clubID: uid },
  })

  invalidatePublicData()
  return NextResponse.json(club)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params

  await prisma.player.updateMany({
    where: { clubId: id },
    data: { clubId: null },
  })
  await prisma.club.delete({ where: { id } })
  invalidatePublicData()
  return NextResponse.json({ ok: true })
}
