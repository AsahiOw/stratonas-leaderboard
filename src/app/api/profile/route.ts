import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { currentPlayer } from '@/lib/discord-player'
import { invalidatePublicData, jsonWithNoStore } from '@/lib/cache'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return jsonWithNoStore({ error: 'Sign in first.' }, { status: 401 })
  const [player, account] = await Promise.all([
    currentPlayer(session.user.id),
    prisma.account.findFirst({ where: { userId: session.user.id, provider: 'discord' }, select: { providerAccountId: true } }),
  ])
  return jsonWithNoStore({ user: session.user, discordId: account?.providerAccountId || null, player })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return jsonWithNoStore({ error: 'Sign in first.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some((key) => !['ign', 'favouriteStudentId', 'ignImportLocked', 'favouriteStudentImportLocked'].includes(key))) {
    return jsonWithNoStore({ error: 'Only IGN, favourite student, and their import locks can be changed.' }, { status: 400 })
  }
  const data: { ign?: string; favouriteStudentId?: number; favouriteStudent?: string; ignImportLocked?: boolean; favouriteStudentImportLocked?: boolean } = {}
  for (const key of ['ignImportLocked', 'favouriteStudentImportLocked'] as const) {
    if (key in body) {
      if (typeof body[key] !== 'boolean') return jsonWithNoStore({ error: 'Import locks must be true or false.' }, { status: 400 })
      data[key] = body[key]
    }
  }
  if ('ign' in body) {
    if (typeof body.ign !== 'string' || !body.ign.trim() || body.ign.trim().length > 64 || /[\u0000-\u001f\u007f]/.test(body.ign)) {
      return jsonWithNoStore({ error: 'IGN must be 1–64 characters without control characters.' }, { status: 400 })
    }
    data.ign = body.ign.trim()
  }
  let student = null
  if ('favouriteStudentId' in body) {
    if (typeof body.favouriteStudentId !== 'number' || !Number.isInteger(body.favouriteStudentId) || body.favouriteStudentId <= 0 || body.favouriteStudentId > 2147483647) {
      return jsonWithNoStore({ error: 'Choose an existing student.' }, { status: 400 })
    }
    student = await prisma.student.findUnique({
      where: { id: body.favouriteStudentId },
      select: { id: true, name: true, image: true, portrait: true, memorial: true },
    })
    if (!student) return jsonWithNoStore({ error: 'Choose an existing student.' }, { status: 400 })
    data.favouriteStudentId = student.id
    data.favouriteStudent = student.name
  }
  // Ownership is resolved on the server; the request cannot choose a player.
  const result = await prisma.player.updateMany({ where: { ownerId: session.user.id }, data })
  if (!result.count) return jsonWithNoStore({ error: 'No player is linked to your account.' }, { status: 404 })
  invalidatePublicData()
  return jsonWithNoStore({ ...data, ...(student ? { favouriteStudentData: student } : {}) })
}
