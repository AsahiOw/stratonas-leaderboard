import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Discord from 'next-auth/providers/discord'
import { authAdapter } from './auth-adapter'
import { linkDiscordPlayer } from './discord-player'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

const DUMMY_PASSWORD_HASH = '$2a$12$TUnCad.fsTZkB/7m9FKcv.cuf8nVUnVyjN7e/8ZOnKppsAqozwa06'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: authAdapter,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Discord({ issuer: 'https://discord.com', authorization: { params: { scope: 'identify' } } }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (typeof credentials?.email !== 'string' || typeof credentials?.password !== 'string') return null
        const email = credentials.email.normalize('NFKC').trim().toLowerCase()
        const password = credentials.password
        if (!email || email.length > 254 || !password || password.length > 256) return null
        const user = await prisma.user.findUnique({
          where: { email },
        })
        const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_PASSWORD_HASH)
        if (!user || !ok || user.role !== 'ADMIN') return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      if (user.id && account?.provider === 'discord') {
        await linkDiscordPlayer(user.id, account.providerAccountId)
      }
    },
  },
  callbacks: {
    async signIn({ account }) {
      if (account?.provider !== 'discord') return true
      const linked = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: 'discord', providerAccountId: account.providerAccountId } },
        select: { user: { select: { passwordHash: true } } },
      })
      return !linked || linked.user.passwordHash === null
    },
    async jwt({ token, user, account }) {
      if (user) { token.id = user.id; token.authProvider = account?.provider }
      // Untagged sessions predate account separation and must authenticate again.
      if (token.authProvider !== 'credentials' && token.authProvider !== 'discord') return null
      const id = token.id as string | undefined
      const current = id ? await prisma.user.findUnique({ where: { id }, select: { role: true, passwordHash: true } }) : null
      if (!current) return null
      if (token.authProvider === 'discord' && current.passwordHash !== null) return null
      if (token.authProvider === 'credentials' && (!current.passwordHash || current.role !== 'ADMIN')) return null
      token.role = current.role
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'ADMIN' | 'MANAGER' | 'VIEWER'
      }
      return session
    },
  },
})
