import { auth } from './auth'
import { jsonWithNoStore } from '@/lib/cache'

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return jsonWithNoStore({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
