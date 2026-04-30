import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { PlayerStatus } from '@prisma/client'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const player = await prisma.player.update({
    where: { id: params.id },
    data: {
      ign: body.ign,
      username: body.username,
      favouriteStudent: body.favouriteStudent || null,
      joinedDate: body.joinedDate ? new Date(body.joinedDate) : undefined,
      club: body.club || null,
      clubID: body.clubID || null,
      userID: body.userID || null,
      status: body.status === 'INACTIVE' ? PlayerStatus.INACTIVE : PlayerStatus.ACTIVE,
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
