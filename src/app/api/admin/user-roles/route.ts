import { prisma } from '@/lib/prisma'
import { requireRoleAdmin } from '@/lib/auth-guard'
import { jsonWithNoStore } from '@/lib/cache'
import { withAdminMutationAudit } from '@/lib/admin-activity'

export async function GET() {
  const guard = await requireRoleAdmin()
  if (guard) return guard
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true,
      accounts: { where: { provider: 'discord' }, select: { providerAccountId: true } },
      player: { select: { id: true, ign: true } },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
  return jsonWithNoStore(users)
}

async function patch(request: Request) {
  const guard = await requireRoleAdmin()
  if (guard) return guard
  const body = await request.json().catch(() => null)
  if (!body || typeof body.userId !== 'string' || !['VIEWER', 'MANAGER'].includes(body.role)) {
    return jsonWithNoStore({ error: 'Choose a user and either Viewer or Manager.' }, { status: 400 })
  }
  const result = await prisma.user.updateMany({
    where: { id: body.userId, role: { not: 'ADMIN' } },
    data: { role: body.role },
  })
  if (!result.count) return jsonWithNoStore({ error: 'User not found or is an administrator.' }, { status: 409 })
  return jsonWithNoStore({ id: body.userId, role: body.role })
}

export const PATCH = withAdminMutationAudit({ action: 'UPDATE', entityType: 'user-role', summary: 'Updated user role' }, patch)
