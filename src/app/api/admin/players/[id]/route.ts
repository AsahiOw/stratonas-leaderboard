import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const club = body.club?.trim() || 'Guest'
  const clubID = body.clubID?.trim() || (club === 'Guest' ? 'GUEST' : null)
  const userID = body.userID?.trim() || `AUTO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const player = await prisma.player.update({
    where: { id: params.id },
    data: {
      ign: body.ign,
      username: body.username,
      favouriteStudent: body.favouriteStudent || 'Hoshino',
      joinedDate: body.joinedDate ? new Date(body.joinedDate) : undefined,
      club,
      clubID,
      userID,
    },
  })
  return NextResponse.json(player)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  await prisma.raidEntry.deleteMany({ where: { playerId: params.id } })
  await prisma.player.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
