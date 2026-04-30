import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
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
  const club = body.club?.trim() || 'Guest'
  const clubID = body.clubID?.trim() || (club === 'Guest' ? 'GUEST' : null)
  const userID = body.userID?.trim() || `AUTO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const player = await prisma.player.create({
    data: {
      ign: body.ign,
      username: body.username,
      favouriteStudent: body.favouriteStudent || 'Hoshino',
      joinedDate: body.joinedDate ? new Date(body.joinedDate) : new Date(),
      club,
      clubID,
      userID,
    },
  })
  return NextResponse.json(player, { status: 201 })
}
