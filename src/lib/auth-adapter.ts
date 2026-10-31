import { PrismaAdapter } from '@auth/prisma-adapter'
import type { Adapter } from 'next-auth/adapters'
import { prisma } from './prisma'

const base = PrismaAdapter(prisma)

export const authAdapter: Adapter = {
  ...base,
  async linkAccount(account) {
    if (account.provider !== 'discord') { await base.linkAccount!(account); return account }
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${account.userId} FOR UPDATE`
      const user = await tx.user.findUnique({ where: { id: account.userId }, select: { role: true, passwordHash: true } })
      if (!user || user.passwordHash !== null || user.role !== 'VIEWER') {
        throw new Error('Sign out before signing in with a different Discord account. Privileged and password accounts cannot link new Discord identities.')
      }
      await tx.account.create({ data: account })
      return account
    })
  },
}
