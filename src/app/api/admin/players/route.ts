import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { normalizeStudentId } from '@/lib/students'
export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const players = await prisma.player.findMany({
    include: { favouriteStudentData: true },
    orderBy: { ign: 'asc' },
  })
  return NextResponse.json(players)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const club = body.club?.trim() || 'Guest'
  const clubID = body.clubID?.trim() || (club === 'Guest' ? 'GUEST' : null)
  const userID = body.userID?.trim() || `AUTO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const favouriteStudentId = normalizeStudentId(body.favouriteStudentId)
  const favouriteStudentData = favouriteStudentId
    ? await prisma.student.findUnique({ where: { id: favouriteStudentId } })
    : null
  const player = await prisma.player.create({
    data: {
      ign: body.ign,
      username: body.username,
      favouriteStudent: favouriteStudentData?.name || body.favouriteStudent || 'Hoshino',
      favouriteStudentId: favouriteStudentData?.id || null,
      joinedDate: body.joinedDate ? new Date(body.joinedDate) : new Date(),
      club,
      clubID,
      userID,
      isGuildMember: body.isGuildMember ?? true,
    },
  })
  return NextResponse.json(player, { status: 201 })
}
