import { auth } from './auth'
import { jsonWithNoStore } from '@/lib/cache'
import { prisma } from '@/lib/prisma'

/**
 * Server-only UI hint and API authorization primitive. The current database
 * role is authoritative, including promotions and demotions during a session.
 */
export async function isCurrentAdmin(roles: readonly string[] = ['ADMIN', 'MANAGER']) {
  let session
  try {
    session = await auth()
  } catch {
    return false
  }
  const userId = session?.user?.id
  if (!userId) {
    return false
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    return Boolean(user && roles.includes(user.role))
  } catch {
    return false
  }
}

export async function requireAdmin() {
  if (!(await isCurrentAdmin())) return jsonWithNoStore({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function requireRoleAdmin() {
  if (!(await isCurrentAdmin(['ADMIN']))) return jsonWithNoStore({ error: 'Forbidden' }, { status: 403 })
  return null
}
