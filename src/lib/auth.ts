import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

const DUMMY_PASSWORD_HASH = '$2a$12$TUnCad.fsTZkB/7m9FKcv.cuf8nVUnVyjN7e/8ZOnKppsAqozwa06'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: '/',
  },
  providers: [
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
        if (!user || !ok) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: 'ADMIN' | 'VIEWER' }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'ADMIN' | 'VIEWER'
      }
      return session
    },
  },
})
