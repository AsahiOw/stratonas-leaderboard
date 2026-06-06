import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { normalizeStudentId } from '@/lib/students'

function playerErrorResponse(error: unknown, fallback = 'Could not save player.') {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
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
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
    }
  }
  return NextResponse.json({ error: fallback }, { status: 500 })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
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
    const player = await prisma.player.update({
      where: { id },
      data: {
        ign: body.ign.trim(),
        username: body.username.trim(),
        favouriteStudent: favouriteStudentData?.name || body.favouriteStudent || 'Hoshino',
        favouriteStudentId: favouriteStudentData?.id || null,
        joinedDate: body.joinedDate ? new Date(body.joinedDate) : undefined,
        club,
        clubID,
        clubId: clubData?.id || null,
        userID,
        isGuildMember,
      },
    })
    invalidatePublicData()
    return NextResponse.json(player)
  } catch (error) {
    return playerErrorResponse(error)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  try {
    await prisma.raidEntry.deleteMany({ where: { playerId: id } })
    await prisma.player.delete({ where: { id } })
    invalidatePublicData()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return playerErrorResponse(error, 'Could not delete player.')
  }
}
