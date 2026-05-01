import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const players = await prisma.player.findMany({
    where: { isGuildMember: true },
    orderBy: { ign: 'asc' },
    select: {
      id: true,
      ign: true,
      username: true,
      favouriteStudent: true,
      favouriteStudentId: true,
      favouriteStudentData: true,
      club: true,
      clubID: true,
      userID: true,
      joinedDate: true,
    },
  })
  return NextResponse.json(players)
}
