import { prisma } from '@/lib/prisma'

export async function getRankedRaidEntries(raidId: string, take?: number) {
  const entries = await prisma.raidEntry.findMany({
    where: { raidId },
    include: {
      player: {
        include: {
          favouriteStudentData: true,
          clubData: true,
        },
      },
    },
    orderBy: { score: 'desc' },
    ...(take ? { take } : {}),
  })

  return entries.map((e, i) => ({
    rank: i + 1,
    name: e.player.ign,
    score: e.score,
    isGuild: e.player.isGuildMember,
    club: e.player.clubData?.name || e.player.club,
    clubColor: e.player.clubData?.color || null,
    clubLogo: e.player.clubData?.logo || null,
    favouriteStudent: e.player.favouriteStudentData?.name || e.player.favouriteStudent,
    favouriteStudentImage: e.player.favouriteStudentData?.image || null,
    favouriteStudentPortrait: e.player.favouriteStudentData?.portrait || e.player.favouriteStudentData?.image || null,
    favouriteStudentMemorial: e.player.favouriteStudentData?.memorial || null,
    playerId: e.player.id,
  }))
}
