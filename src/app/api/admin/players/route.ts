import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { normalizeStudentId } from '@/lib/students'

function playerErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = error.meta?.target
    const fields = Array.isArray(target) ? target.map(String) : []
    if (fields.includes('username')) {
      return NextResponse.json({ error: 'A player with this username already exists.' }, { status: 409 })
    }
    if (fields.includes('userID')) {
      return NextResponse.json({ error: 'A player with this user ID already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'A player with these details already exists.' }, { status: 409 })
  }
  return NextResponse.json({ error: 'Could not save player.' }, { status: 500 })
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  try {
    const players = await prisma.player.findMany({
      include: { favouriteStudentData: true, clubData: true },
      orderBy: { ign: 'asc' },
    })
    return NextResponse.json(players)
  } catch {
    return NextResponse.json({ error: 'Could not load players.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  if (!body.ign?.trim() || !body.username?.trim()) {
    return NextResponse.json({ error: 'IGN and username are required.' }, { status: 400 })
  }
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
  try {
    const player = await prisma.player.create({
      data: {
        ign: body.ign.trim(),
        username: body.username.trim(),
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
    invalidatePublicData()
    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    return playerErrorResponse(error)
  }
}
