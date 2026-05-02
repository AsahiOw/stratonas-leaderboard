import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { normalizeStudentId } from '@/lib/students'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const players = await prisma.player.findMany({
    include: { favouriteStudentData: true, clubData: true },
    orderBy: { ign: 'asc' },
  })
  return NextResponse.json(players)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const isGuildMember = body.isGuildMember ?? true
  const clubData = isGuildMember && typeof body.clubId === 'string' && body.clubId.trim()
    ? await prisma.club.findUnique({ where: { id: body.clubId.trim() } })
    : null
  if (isGuildMember && !clubData) {
    return NextResponse.json({ error: 'A valid club is required for non-guest players.' }, { status: 400 })
  }
  const club = isGuildMember ? clubData!.name : 'Guest'
  const clubID = isGuildMember ? clubData!.uid : 'GUEST'
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
      clubId: clubData?.id || null,
      userID,
      isGuildMember,
    },
  })
  return NextResponse.json(player, { status: 201 })
}
