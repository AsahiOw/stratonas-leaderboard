import { auth } from './auth'
import { jsonWithNoStore } from '@/lib/cache'
import { prisma } from '@/lib/prisma'

export async function requireAdmin() {
  let session
  try {
    session = await auth()
  } catch {
    return jsonWithNoStore({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session?.user?.id
  if (!userId || (session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    return jsonWithNoStore({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (user?.role !== 'ADMIN') return jsonWithNoStore({ error: 'Unauthorized' }, { status: 401 })
  return null
}
