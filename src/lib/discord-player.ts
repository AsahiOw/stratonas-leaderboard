import { prisma } from './prisma'

// The Discord ID comes from the verified OAuth account, never from a client form.
export async function linkDiscordPlayer(userId: string, discordId: string) {
  return prisma.$transaction(async (tx) => {
    // Serialize simultaneous callbacks/profile requests for the same account.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
    const owned = await tx.player.findUnique({ where: { ownerId: userId } })
    if (owned) return owned
    await tx.player.updateMany({
      where: { userID: discordId, ownerId: null },
      data: { ownerId: userId },
    })
    return tx.player.findUnique({ where: { ownerId: userId } })
  })
}

export async function currentPlayer(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'discord' },
    select: { providerAccountId: true },
  })
  if (account) await linkDiscordPlayer(userId, account.providerAccountId)
  return prisma.player.findUnique({
    where: { ownerId: userId },
    include: { clubData: true, favouriteStudentData: { select: { id: true, name: true, image: true, portrait: true, memorial: true } }, _count: { select: { entries: true } } },
  })
}
