import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { PlayerStatus } from '@prisma/client'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const players = await prisma.player.findMany({ orderBy: { ign: 'asc' } })
  return NextResponse.json(players)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const player = await prisma.player.create({
    data: {
      ign: body.ign,
      username: body.username,
      favouriteStudent: body.favouriteStudent || null,
      joinedDate: body.joinedDate ? new Date(body.joinedDate) : new Date(),
      club: body.club || null,
      clubID: body.clubID || null,
      userID: body.userID || null,
      status: body.status === 'INACTIVE' ? PlayerStatus.INACTIVE : PlayerStatus.ACTIVE,
    },
  })
  return NextResponse.json(player, { status: 201 })
}
