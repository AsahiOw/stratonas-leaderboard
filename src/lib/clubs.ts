import { prisma } from '@/lib/prisma'

export function normalizeClubName(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const name = String(value).trim()
  if (!name || name.toLowerCase() === 'guest') return null
  return name
}

export async function resolveClub(value: unknown) {
  const name = normalizeClubName(value)
  if (!name) return null

  const existing = await prisma.club.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) return existing

  return prisma.club.create({ data: { name } })
}
