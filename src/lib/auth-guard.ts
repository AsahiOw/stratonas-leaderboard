import { auth } from './auth'
import { jsonWithNoStore } from '@/lib/cache'
import { prisma } from '@/lib/prisma'

/**
 * Server-only UI hint and API authorization primitive.  The JWT role is only
 * a fast first check; the current database role is authoritative so a role
 * demotion cannot leave an admin UI hint active until token expiry.
 */
export async function isCurrentAdmin() {
  let session
  try {
    session = await auth()
  } catch {
    return false
  }
  const userId = session?.user?.id
  if (!userId || (session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    return false
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    return user?.role === 'ADMIN'
  } catch {
    return false
  }
}

export async function requireAdmin() {
  if (!(await isCurrentAdmin())) return jsonWithNoStore({ error: 'Unauthorized' }, { status: 401 })
  return null
}
